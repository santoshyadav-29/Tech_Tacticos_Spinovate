from fastapi import HTTPException

class CameraNotAvailableException(HTTPException):
    def __init__(self):
        super().__init__(status_code=503, detail="Camera not available")

class MonitoringNotActiveException(HTTPException):
    def __init__(self):
        super().__init__(status_code=400, detail="Monitoring session not active")

class MonitoringAlreadyActiveException(HTTPException):
    def __init__(self):
        super().__init__(status_code=400, detail="Monitoring session already active")