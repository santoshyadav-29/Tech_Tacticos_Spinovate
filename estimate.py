def compute_posture_angles(x1, x2):
    # Coefficients for each y_m
    coefficients = {
        'Degree of Anteversion of Cervical Spine (y1)': [-0.345462593, 0.0973337751, -0.00116986691, 0.0145517549, 49.3331444],
        'T1 Slope (y2)': [-1.39473277, 0.0907350841, 0.00493042464, 0.00227851532, 96.5556857],
        'Upper Thoracic Kyphosis Angle (y3)': [0.375504742, -0.538277117, 0.0000972785515, -0.00399718675, 133.6831],
        'Middle and Lower Thoracic Kyphosis Angle (y4)': [-0.202113942, 0.0260799211, 0.000956194272, 0.000809022888, 162.575115],
        'Lumbar Lordosis Angle (y5)': [-0.231200126, 0.0320771938, 0.00107482760, -0.00260748300, 180.932086]
    }

    results = {}
    
    for angle_name, (a1, a2, a3, a4, a5) in coefficients.items():
        y = a1 * x1 + a2 * x2 + a3 * (x1 ** 2) + a4 * (x2 ** 2) + a5
        results[angle_name] = y

    return results

# Example usage:
if __name__ == "__main__":
    try:
        x1 = float(input("Enter head distance from webcam (X1): "))
        x2 = float(input("Enter head pitch angle in degrees (X2): "))
        
        posture_angles = compute_posture_angles(x1, x2)
        
        print("\nComputed Posture Angles:")
        for angle_name, value in posture_angles.items():
            print(f"{angle_name}: {value:.2f} degrees")

    except ValueError:
        print("Please enter valid numeric values for X1 and X2.")
