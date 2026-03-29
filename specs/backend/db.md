设置数据库当中的数据结构
auth 用户表单
sessions 对话的session
    - session最后的状态，reject, in_progress, pending（AI同意投资等待人工审核）, pass（人工审核通过）
    - 创建时间，更新时间
    - 选择的投资人
messages 对话当中对应的信息
    - user message
    - assistant message
    - tool message
invest_record 投资记录
    - 对应的session
    - 金额
    - 钱包地址（USDC）
    - 投资人
    - 审核状态（pending_review → approved / rejected）
    - 审核人、审核时间、审核备注
    - 时间等
