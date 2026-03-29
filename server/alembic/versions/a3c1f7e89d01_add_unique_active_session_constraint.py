"""add_unique_active_session_constraint

Revision ID: a3c1f7e89d01
Revises: 0778e2b875e3
Create Date: 2026-03-28 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3c1f7e89d01'
down_revision: Union[str, Sequence[str], None] = '0778e2b875e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add partial unique index: only one IN_PROGRESS session per user+investor."""
    # Clean up any existing duplicates before adding the constraint:
    # keep only the most recent IN_PROGRESS session per (user_id, investor_id).
    op.execute("""
        UPDATE sessions SET status = 'PENDING'
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, investor_id
                           ORDER BY created_at DESC
                       ) AS rn
                FROM sessions
                WHERE status = 'IN_PROGRESS'
            ) ranked
            WHERE rn > 1
        )
    """)

    op.execute("""
        CREATE UNIQUE INDEX uq_one_active_session_per_investor
        ON sessions (user_id, investor_id)
        WHERE status = 'IN_PROGRESS'
    """)


def downgrade() -> None:
    """Remove the partial unique index."""
    op.drop_index('uq_one_active_session_per_investor', table_name='sessions')
