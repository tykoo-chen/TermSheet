# Rate Limit 现状分析：为什么用户总是可以重新 pitch 投资人

> 结论：当前限流策略在**产品层面基本失效**。后端虽然有 session 级别的检查，
> 但多个设计缺陷叠加后，一个有动机的用户可以无限次重新 pitch 同一个投资人，
> 且每次都能获得"全新的"对话体验。

---

## 1. 当前限流设计概览

| 维度 | 设计值 | 实现位置 |
|------|--------|----------|
| 每条消息 token 上限 | 500 tokens | 前后端各自检查 |
| 每 session 消息轮数 | 8 rounds | 后端 DB 计数 |
| session 时间窗口 | 5 分钟 | 后端 `created_at` 计算 |
| pitch 频率 | 每投资人每周 1 次 | 后端按 ISO week 查找 session |
| 用户识别 | Supabase JWT `sub` claim | 仅 user_id，无 IP/设备维度 |
| HTTP 层限流 | **无** | 没有 slowapi/nginx/API gateway |

---

## 2. 致命缺陷：逐一分析

### 缺陷 #1：Session 不在 "Start Pitch" 时创建，而在第一条消息时才创建

**代码位置**: `routes.py:199-208`

```python
else:
    # First pitch this week → create session
    session = Session(
        user_id=uuid.UUID(user_id),
        investor_id=request.shark_id,
        status=SessionStatus.IN_PROGRESS,
    )
```

**影响**：用户可以：
1. 点击 "Start Pitch" → 看到投资人的 greeting
2. 阅读 greeting，理解投资人风格和偏好
3. 关闭页面，不发送任何消息
4. 反复执行步骤 1-3，每次都能看到 greeting

后端没有任何记录——session 从未被创建。**用户在正式发消息之前，可以无限次"预览"投资人**，这完全违背了"1 pitch per week"的设计意图。

---

### 缺陷 #2（核心）：对话历史在页面刷新后丢失 → LLM 上下文完全重置

**代码位置**: `page.tsx:30`（messages 仅存在于 React state）

```typescript
const [messages, setMessages] = useState<Message[]>([]);
```

Messages **没有**持久化到 localStorage、sessionStorage 或后端恢复接口。当用户在 session 活跃期间（5 分钟内、rounds 未用完）：

1. 关闭标签页 / 刷新页面
2. 重新进入 → `checkRateLimit()` 恢复 `sessionId`、`roundsUsed`、`timeLeft`
3. 但 `messages` 是空的 `[]`
4. 用户发送新消息 → `apiMessages` 只包含新消息
5. **后端将只有新消息传给 LLM** → 投资人 AI 完全遗忘之前的对话

**后果**：

- 用户第一次 pitch 说了个糟糕的故事 → 投资人提出尖锐质疑
- 用户刷新页面 → 投资人"失忆"
- 用户用改良后的版本重新 pitch → 投资人只看到新内容
- rounds 计数正确递减，但**对话质量被"软重置"**了

这是最核心的问题：**用户可以在同一个 session 内通过刷新页面获得无限次"重新来过"的机会**，虽然 round 预算在消耗，但每次刷新后投资人都会忘记之前的弱点。

---

### 缺陷 #3：无 IP/设备级别限流 → 多账号无限 pitch

**代码位置**: `routes.py:158`

```python
user_id = user["sub"]  # 唯一的身份标识
```

限流完全基于 Supabase `user_id`。没有：
- IP 地址限流
- 设备指纹
- CAPTCHA
- 手机号验证
- 邮箱域名限制

**后果**：用户注册一个新邮箱 = 对所有投资人获得全新的 pitch 配额。这是最简单、最彻底的绕过方式。

---

### 缺陷 #4：Round 计数 off-by-one — 实际可用 9 轮而非 8 轮

**代码位置**: `routes.py:69-83`

```python
async def _count_user_rounds(db, session_id):
    # ... count USER messages ...
    # The first "user" message is the bootstrap prompt (investor intro request),
    # not a real user round — subtract 1, floor at 0.
    return max(total - 1, 0)
```

代码注释说"第一条 user 消息是 bootstrap prompt"，但实际流程中**不存在 bootstrap prompt**。前端发送的第一条消息就是用户的真实 pitch 内容。

结果：每条真实消息都被少计 1 轮。用户实际上有 **9 轮**而不是 8 轮。

---

### 缺陷 #5：前后端计时器不同步

**前端**：`page.tsx:81-94` — 倒计时从 `startPitch()` 点击时开始

**后端**：`routes.py:86-92` — 从 `session.created_at`（第一条消息时）开始计算

| 事件 | 前端计时 | 后端计时 |
|------|----------|----------|
| 用户点击 Start Pitch | 5:00 ← 开始倒计时 | 无 session |
| 用户思考 2 分钟 | 3:00 | 无 session |
| 用户发送第一条消息 | 3:00 | 5:00 ← session 刚创建 |
| 前端显示 0:00 | session 结束 | 还剩 2:00 |

用户的前端显示 session 已结束，但后端仍然允许请求。如果用户刷新页面，`checkRateLimit` 返回新的 `time_left`（后端还剩的时间），用户**凭空获得额外 2 分钟**。

---

### 缺陷 #6：Token 估算公式不一致

| 端 | 公式 | 500 字符 → tokens |
|----|------|-------------------|
| 前端 | `ceil(len / 3.5)` | 143 |
| 后端 | `ceil(len / 3)` | 167 |

前端认为合法的消息，后端可能拒绝（422）。反过来，前端标红的消息在后端可能是合法的。这不是绕过漏洞，但导致用户体验混乱。

---

### 缺陷 #7：`checkRateLimit` 网络失败时默认放行

**代码位置**: `page.tsx:73-75`

```typescript
} catch {
    // If backend is unreachable, allow pitch (backend will enforce anyway)
}
```

如果 rate-limit 检查请求失败（网络问题、后端重启），前端默认允许 pitch。虽然后端也会在 `/api/chat` 时检查，但这意味着**前端的 "WEEKLY LIMIT REACHED" 屏障可以被绕过**——用户可以在后端短暂不可达时进入 pitch 界面。

---

### 缺陷 #8：无 DB 唯一约束 → 并发 race condition

**代码位置**: `tables.py:33-63`

`sessions` 表没有 `UNIQUE(user_id, investor_id, week)` 约束。如果用户快速双击或并发发送请求：

1. 请求 A: `_resolve_session()` → None → 创建 session 1
2. 请求 B: `_resolve_session()` → None（session 1 还没 commit）→ 创建 session 2
3. 用户现在对同一个投资人有 2 个 session，各有 8 轮 = **共 16 轮**

weekly lookup 用 `.order_by(created_at.desc()).limit(1)` 只找最新的，旧 session 变成孤儿但如果用户保留了 `session_id` 仍可继续使用。

---

### 缺陷 #9：Session 过期后状态不主动更新

**代码位置**: `routes.py:180-198`

Session 状态只在以下时机被设为 `PENDING`：
- 用户**发送新消息**时触发 `POST /api/chat` 中的检查

`GET /api/rate-limit` **不会**更新 session 状态，它只做只读计算。这意味着：

- 过期的 session 在 DB 中一直是 `IN_PROGRESS`
- `check_rate_limit` 通过计算 `time_left == 0` 来判断 → 返回 `blocked: true`
- 这目前 work，但依赖所有调用方都正确处理 `time_left`，而不是只看 `status`

如果未来有其他服务直接查 `session.status`，会得到错误结论。

---

## 3. 攻击场景复现

### 场景 A：普通用户"软重置"（无需技术能力）

```
1. 进入 /sharks/mark-cuban → 点击 Start Pitch
2. 发送 2 条消息 → pitch 不理想
3. 刷新页面 (F5)
4. 页面重新加载 → checkRateLimit 返回 session（allowed: true, rounds_used: 2）
5. 点击 Start Pitch → messages = [greeting only]
6. 发送第 3 条消息 → 后端收到只包含 1 条消息的 apiMessages
7. Mark Cuban AI 完全不记得之前的 2 条消息
8. 用户用打磨过的 pitch 重新开始，虽然只剩 6 轮，但获得了全新的投资人印象
```

### 场景 B：多账号（低技术门槛）

```
1. 用 email1@gmail.com 注册 → pitch Mark Cuban → 失败
2. 用 email2@gmail.com 注册 → pitch Mark Cuban → 再次尝试
3. 无限重复
```

### 场景 C：并发请求利用 race condition

```
1. 用户打开两个标签页，同时点击 Start Pitch
2. 同时发送第一条消息 → 两个请求几乎同时到达
3. _resolve_session 都返回 None → 各自创建新 session
4. 用户获得 2 个 session × 8 轮 = 16 轮 pitch 机会
```

### 场景 D：计时器漂移利用

```
1. 点击 Start Pitch → 前端开始倒计时
2. 等 2 分钟，不发消息
3. 发送第一条消息 → 后端创建 session（5 分钟从现在开始）
4. 前端倒计时到 0 → 前端显示 session ended
5. 刷新页面 → checkRateLimit 返回 time_left ≈ 180 秒
6. 用户凭空获得 ~3 分钟额外时间
```

---

## 4. 严重程度评估

| 缺陷 | 严重程度 | 利用难度 | 影响 |
|-------|----------|----------|------|
| #1 无限预览 greeting | 🟡 中 | 零（正常操作） | 信息泄露，违反设计意图 |
| #2 对话历史丢失/LLM 重置 | 🔴 致命 | 零（刷新页面） | 完全绕过 pitch 质量限制 |
| #3 多账号 | 🔴 致命 | 低（注册新账号） | 完全绕过所有限流 |
| #4 Off-by-one | 🟡 中 | 自动触发 | 9 轮 vs 8 轮 |
| #5 计时器不同步 | 🟠 高 | 低（刷新页面） | 获得额外时间 |
| #6 Token 公式不一致 | 🟢 低 | 边缘情况 | UX 混乱 |
| #7 网络失败放行 | 🟡 中 | 需要时机 | 绕过前端屏障 |
| #8 Race condition | 🟠 高 | 中（双击/并发） | 双倍 session 配额 |
| #9 状态不主动更新 | 🟡 中 | 未来隐患 | 数据不一致 |

---

## 5. 根因总结

当前限流架构有一个根本性的设计问题：

> **限流发生在 session 层，但对话上下文不跟随 session 持久化。**

Session 跟踪了"你用了几轮"和"时间过了多久"，但没有确保 LLM 看到的是完整的对话历史。前端负责传递 messages，但 messages 不持久化。这意味着 session 限流只限制了**量**（轮数、时间），没有限制**质**（每次对话的完整性）。

加上没有 IP/设备级限流，一个有动机的用户可以：
1. 刷新页面 → 重置投资人记忆（同 session，消耗 rounds）
2. 注册新账号 → 重置一切（新 session，新 rounds）

这两个路径让"每周 1 次 pitch"的限流承诺形同虚设。
