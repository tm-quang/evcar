const fs = require('fs');
const files = ['index.tsx', 'VehicleTrips.tsx', 'VehicleReports.tsx', 'VehicleFuel.tsx', 'VehicleChargingHistory.tsx'];
files.forEach(f => {
    const path = 'c:/Users/minhq/Desktop/PROJECT-RUN/BOfin_app/src/pages/vehicles/' + f;
    let txt = fs.readFileSync(path, 'utf8');
    if (txt.includes('năme')) {
        fs.writeFileSync(path, txt.split('năme').join('name'));
        console.log('Fixed', f);
    }
});
