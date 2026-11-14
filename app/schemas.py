from pydantic import BaseModel, ConfigDict, StrictBool


class DetectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input: str
    include_scores: StrictBool = True


class WindowCounts(BaseModel):
    total: int
    scored: int
    skipped: int
    hit: int


class Region(BaseModel):
    start: int
    end: int
    length: int
    score_mean: float
    score_max: float
    n_windows: int


class Track(BaseModel):
    stride: int
    width: int
    values: list[float | None]


class RecordResult(BaseModel):
    id: str
    length: int
    ambiguous_bases: int
    windows: WindowCounts
    regions: list[Region]
    scores: Track | None = None
    warnings: list[str]


class DetectResult(BaseModel):
    model: dict
    parameters: dict
    records: list[RecordResult]
    timing_ms: dict[str, int]
