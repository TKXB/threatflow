from pydantic import BaseModel
from typing import Dict, Any


class OTM(BaseModel):
    otmVersion: str
    name: str
    extensions: Dict[str, Any] | None = None

