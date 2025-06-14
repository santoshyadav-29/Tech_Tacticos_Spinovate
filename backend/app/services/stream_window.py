import subprocess
import numpy as np
import cv2
from mss import mss
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import time
import io

# Replace this with your window name
WINDOW_TITLE = "python main.py"

def get_window_geometry(title: str):
    try:
        cmd = f"xdotool search --name \"{title}\""
        window_id = subprocess.check_output(cmd, shell=True).decode().strip().split('\n')[0]

        geometry = subprocess.check_output(
            ["xwininfo", "-id", window_id]
        ).decode()

        x = int(geometry.split("Absolute upper-left X:")[1].splitlines()[0].strip())
        y = int(geometry.split("Absolute upper-left Y:")[1].splitlines()[0].strip())
        width = int(geometry.split("Width:")[1].splitlines()[0].strip())
        height = int(geometry.split("Height:")[1].splitlines()[0].strip())

        return {"top": y, "left": x, "width": width, "height": height}
    except Exception as e:
        print("Error finding window:", e)
        return None

def stream_window():
    region = get_window_geometry(WINDOW_TITLE)
    if not region:
        yield b''
        return

    with mss() as sct:
        while True:
            img = np.array(sct.grab(region))
            _, jpeg = cv2.imencode('.jpg', img)
            frame = jpeg.tobytes()
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
            )
            time.sleep(0.03)  # ~30 FPS