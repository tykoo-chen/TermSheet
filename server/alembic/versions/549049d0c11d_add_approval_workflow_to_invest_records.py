"""add approval workflow to invest_records

Revision ID: 549049d0c11d
Revises: a3c1f7e89d01
Create Date: 2026-03-29 08:42:13.104654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '549049d0c11d'
down_revision: Union[str, Sequence[str], None] = 'a3c1f7e89d01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first
    approvalstatus = sa.Enum('PENDING_REVIEW', 'APPROVED', 'REJECTED', name='approvalstatus')
    approvalstatus.create(op.get_bind(), checkfirst=True)

    # Add as nullable first, backfill, then set NOT NULL
    op.add_column('invest_records', sa.Column('approval_status', approvalstatus, nullable=True))
    op.execute("UPDATE invest_records SET approval_status = 'APPROVED' WHERE approval_status IS NULL")
    op.alter_column('invest_records', 'approval_status', nullable=False)

    op.add_column('invest_records', sa.Column('reviewed_by', sa.UUID(), nullable=True, comment='Admin user who reviewed'))
    op.add_column('invest_records', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invest_records', sa.Column('review_notes', sa.Text(), nullable=True))
    op.create_index(op.f('ix_invest_records_approval_status'), 'invest_records', ['approval_status'], unique=False)

    # Remove server_default from funded_at (now filled manually after approval)
    op.alter_column('invest_records', 'funded_at', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('invest_records', 'funded_at', server_default=sa.text('now()'))
    op.drop_index(op.f('ix_invest_records_approval_status'), table_name='invest_records')
    op.drop_column('invest_records', 'review_notes')
    op.drop_column('invest_records', 'reviewed_at')
    op.drop_column('invest_records', 'reviewed_by')
    op.drop_column('invest_records', 'approval_status')
    sa.Enum(name='approvalstatus').drop(op.get_bind(), checkfirst=True)
