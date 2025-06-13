import numpy as np
from typing import List, Tuple

def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points."""
    return np.linalg.norm(np.array(p1) - np.array(p2))

def calculate_aspect_ratio(landmarks: List[Tuple[int, int]], indices: List[int]) -> float:
    """Calculate aspect ratio for eye or mouth landmarks."""
    top = (euclidean_distance(landmarks[indices[1]], landmarks[indices[5]]) + 
           euclidean_distance(landmarks[indices[2]], landmarks[indices[4]]))
    bottom = 2 * euclidean_distance(landmarks[indices[0]], landmarks[indices[3]])
    return top / bottom if bottom != 0 else 0

def calculate_vector_angle(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calculate angle between two vectors in degrees."""
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)
    dot = np.dot(v1_u, v2_u)
    angle = np.arccos(np.clip(dot, -1.0, 1.0))
    return np.degrees(angle) - 90

def landmarks_to_3d(landmarks, idx: int, w: int, h: int) -> np.ndarray:
    """Convert landmark to 3D coordinates."""
    pt = landmarks[idx]
    return np.array([pt.x * w, pt.y * h, pt.z * w])

def get_face_width_pixels(bbox, image_width: int) -> float:
    """Calculate face width in pixels from bounding box."""
    return bbox.width * image_width