import os
import re

root_dir = r"c:\Users\minhq\Desktop\PROJECT-RUN\BOfin-APP\BOfin_app\Vehicle_App\src"

replacements = [
    (r"lib/vehicles", "lib/ev"),
    (r"components/vehicles", "components/ev"),
    (r"pages/vehicles", "pages/ev"),
    (r"/vehicles/fuel", "/ev/charging"),
    (r"/vehicles/add", "/ev/add"),
    (r"/vehicles/edit", "/ev/edit"),
    (r"/vehicles/trips", "/ev/trips"),
    (r"/vehicles/maintenance", "/ev/maintenance"),
    (r"/vehicles/expenses", "/ev/expenses"),
    (r"/vehicles/reports", "/ev/reports"),
    (r"/vehicles/charging-history", "/ev/history"),
    (r"/vehicles/calculator", "/ev/calculator"),
    (r"'/vehicles'", "'/ev'"),
    (r"\"/vehicles\"", "\"/ev\""),
    (r"`/vehicles`", "`/ev`"),
    (r"/vehicles/", "/ev/"),
    # Specific file renames in imports
    (r"VehicleFuel", "VehicleCharging"),
    (r"AddVehicle", "AddEV"),
    (r"EditVehicle", "EditEV"),
    (r"fuelPriceService", "chargingPriceService"),
]

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, new_content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

for subdir, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith((".ts", ".tsx", ".css")):
            update_file(os.path.join(subdir, file))
