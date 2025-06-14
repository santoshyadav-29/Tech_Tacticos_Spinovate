


class PostureAngles:

    coefficients = {
        'Degree of Anteversion of Cervical Spine (y1)': [-0.345462593, 0.0973337751, -0.00116986691, 0.0145517549, 49.3331444],
        'T1 Slope (y2)': [-1.39473277, 0.0907350841, 0.00493042464, 0.00227851532, 96.5556857],
        'Upper Thoracic Kyphosis Angle (y3)': [0.375504742, -0.538277117, 0.0000972785515, -0.00399718675, 133.6831],
        'Middle and Lower Thoracic Kyphosis Angle (y4)': [-0.202113942, 0.0260799211, 0.000956194272, 0.000809022888, 162.575115],
        'T8-T12-L3 Angle (new)': [0.185880321, 0.188846675, -0.00180326046, -0.00245368196, 174.338503] ,

        'Lumbar Lordosis Angle (y5)': [-0.231200126, 0.0320771938, 0.00107482760, -0.00260748300, 180.932086]
    }

    def __init__(self):
        self.distance = 0
        self.pitch = 0
        self.posture_angles = {}
    
    def compute_posture_angles(self, x1: float, x2: float) -> dict:
        """
        Compute posture angles based on coefficients and input values x1 and x2.
        
        Args:
            x1 (float): Distance.
            x2 (float): Pitch.
        
        Returns:
            dict: Dictionary of computed posture angles.
        """
        self.distance = x1
        self.pitch = x2
        if x1 is None or x2 is None:
            return {}
        results = {}
        for angle_name, (a1, a2, a3, a4, a5) in self.coefficients.items():
            y = a1 * x1 + a2 * x2 + a3 * (x1 ** 2) + a4 * (x2 ** 2) + a5
            results[angle_name] = round(y, 2)
        self.posture_angles = results
        return results
