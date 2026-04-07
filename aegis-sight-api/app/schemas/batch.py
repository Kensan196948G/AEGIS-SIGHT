import enum
import uuid
from datetime import datetime

from pydantic import BaseModel


class BatchJobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class BatchJobType(str, enum.Enum):
    import_devices = "import_devices"
    import_licenses = "import_licenses"
    export_devices = "export_devices"
    export_licenses = "export_licenses"


class BatchImportResponse(BaseModel):
    job_id: uuid.UUID
    job_type: BatchJobType
    status: BatchJobStatus
    total_rows: int = 0
    success_count: int = 0
    error_count: int = 0
    errors: list[dict] = []
    message: str = ""


class BatchJobResponse(BaseModel):
    job_id: uuid.UUID
    job_type: BatchJobType
    status: BatchJobStatus
    total_rows: int
    success_count: int
    error_count: int
    created_at: datetime
    completed_at: datetime | None = None
    created_by: str | None = None


class BatchJobListResponse(BaseModel):
    jobs: list[BatchJobResponse]
    total: int
