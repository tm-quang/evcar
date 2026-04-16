const fs = require('fs');
const path = require('path');

const applyReplacements = (file, replacements) => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [search, replace] of Object.entries(replacements)) {
        if (content.includes(search)) {
            content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    }
};

const replacementsAdd = {
    'Vui l\uFFFDng nh\uFFFDb bi\uFFFbn s\uFFFD v\uFFFD lo\uFFFDio m\uFFFD.': 'Vui lòng nhập biển số và loại xe', // Wait, actual string: 'Vui l\uFFFDng nh\uFFFDb bi\uFFFbn s\uFFFD v\uFFFD lo\uFFFDit xe' -- actually 'Vui l\uFFFDng nh\uFFFDb bi\uFFFbn s\uFFFD v\uFFFD lo\uFFFDi xe'
    'Vui l\uFFFDng nh\uFFFDb bi\uFFFbn s\uFFFD v\uFFFD lo\uFFFDi xe': 'Vui lòng nhập biển số và loại xe',
    'C\uFFFDb nh\uFFFbt th\uFFFDng tin xe th\uFFFDnh c\uFFFDng!': 'Cập nhật thông tin xe thành công!',
    'Th\uFFFDm xe m\uFFFDi th\uFFFDnh c\uFFFDng!': 'Thêm xe mới thành công!',
    'Kh\uFFFDng th\uFFFD luu th\uFFFDng tin xe': 'Không thể lưu thông tin xe',
    'S\uFFFDA XE': 'SỬA XE',
    'TH\uFFFDM XE M\uFFFDI': 'THÊM XE MỚI',
    'C\uFFFDb nh\uFFFbt th\uFFFDng tin xe': 'Cập nhật thông tin xe',
    'Th\uFFFDm xe m\uFFFDi': 'Thêm xe mới',
    '\uFFFD\uFFFBi\uFFFbn d\uFFFBy d\uFFFD th\uFFFDng tin d\uFFFD qu\uFFFbn l\uFFFD t\uFFFbt h\uFFFDn': 'Điền đầy đủ thông tin để quản lý tốt hơn', // Wait: "\uFFFD\uFFFBi\uFFFbn d\uFFFBy d\uFFFD" -> "\uFFFD\uFFFBi\uFFFbn" (Điền), "d\uFFFBy" (đầy), "d\uFFFD" (đủ),  "th\uFFFDng tin" (thông tin), "d\uFFFD" (để), "qu\uFFFbn l\uFFFD" (quản lý), "t\uFFFbt hon"
    '\uFFFD\uFFFBi\uFFFbn d\uFFFBy d\uFFFD th\uFFFDng tin d\uFFFD qu\uFFFbn l\uFFFD t\uFFFbt hon': 'Điền đầy đủ thông tin để quản lý tốt hơn',
    'H\uFFFDnh \uFFFbnh phu\uFFFDng ti\uFFFbn': 'Hình ảnh phương tiện',
    'Xe m\uFFFDy': 'Xe máy',
    'Xe \uFFFD t\uFFFD': 'Xe ô tô',
    'Th\uFFFDng tin c\uFFFD b\uFFFbn': 'Thông tin cơ bản',
    'H\uFFFDng xe': 'Hãng xe',
    'M\uFFFD\uFFFBu s\uFFFbc': 'Màu sắc',
    'M\uFFFDu s\uFFFbc': 'Màu sắc', // 'M\uFFFDu s\uFFFbc'
    'Lo\uFFFDi nhi\uFFFDn li\uFFFBu': 'Loại nhiên liệu',
    '>\uFFFD\uFFFBi\uFFFbn<': '>Điện<',
    'B\uFFFDo hi\uFFFbm & \uFFFDang ki\uFFFbm': 'Bảo hiểm & Đăng kiểm',
    'B\uFFFDo du\uFFFDng l\uFFFDc (km)': 'Bảo dưỡng lúc (km)',
    'B\uFFFDo du\uFFFDng l\uFFFDc (ng\uFFFDy)': 'Bảo dưỡng lúc (ngày)',
    '\uFFFDang luu...': 'Đang lưu...',
    'C\uFFFDb nh\uFFFbt': 'Cập nhật',
    'Th\uFFFDm xe': 'Thêm xe',
    'N\uFFFDm s\uFFFbn xu\uFFFbt': 'Năm sản xuất'
};

const replacementsIndex = {
    'QU\uFFFBN L\uFFFD PH\uFFFD\uFFFDNG TI\uFFFBN': 'QUẢN LÝ PHƯƠNG TIỆN',
    'QU\uFFFBN L\uFFFD PHU\uFFFDNG TI\uFFFBN': 'QUẢN LÝ PHƯƠNG TIỆN',
    'Qu\uFFFbn l\uFFFD ph\uFFFDong ti\uFFFbn': 'Quản lý phương tiện',
    'Qu\uFFFbn l\uFFFD phuong ti\uFFFbn': 'Quản lý phương tiện',
    'Xe c\uFFFBa b\uFFFbn': 'Xe của bạn',
    'S\uFFFD km hi\uFFFbn t\uFFFDi': 'Số km hiện tại',
    'L\uFFFDi nhi\uFFFDn li\uFFFBu': 'Loại nhiên liệu',
    'Lo\uFFFDi nhi\uFFFDn li\uFFFBu': 'Loại nhiên liệu',
    'Th\uFFFDng k\uFFFD': 'Thống kê',
    'xe m\uFFFDy': 'xe máy',
    'Xe m\uFFFDy': 'Xe máy',
    'xe \uFFFD t\uFFFD': 'xe ô tô',
    'Xe \uFFFD t\uFFFD': 'Xe ô tô',
    '\uFFFD t\uFFFD': 'Ô tô',
    'S\uFFFbc \uFFFBi\uFFFbn': 'Sạc điện', // S\uFFFbc \uFFFBi\uFFFbn -> Sạc điện
    'xe di\uFFFbn': 'xe điện',
    'Xe di\uFFFbn': 'Xe điện',
    'Nhi\uFFFDn li\uFFFBu': 'Nhiên liệu',
    'Nhi\uFFFDn Li\uFFFBu': 'Nhiên Liệu',
    'B\uFFFDo du\uFFFDng': 'Bảo dưỡng',
    'B\uFFFDo Du\uFFFDng': 'Bảo Dưỡng',
    'Chi ph\uFFFD th\uFFFDng n\uFFFDy': 'Chi phí tháng này',
    'Chi ph\uFFFD': 'Chi phí',
    'Chi Ph\uFFFD Kh\uFFFDc': 'Chi Phí Khác',
    'Ph\uFFFD kh\uFFFDc': 'Phí khác',
    'T\uFFFDng c\uFFFbng': 'Tổng cộng',
    'Th\uFFFDng tin li\uFFFDn quan': 'Thông tin liên quan',
    'Th\uFFFDng tin li\uFFFDn quan': 'Thông tin liên quan',
    'B\uFFFDo hi\uFFFbm': 'Bảo hiểm',
    '\uFFFDang ki\uFFFbm': 'Đăng kiểm',
    'H\uFFFDnh tr\uFFFDnh': 'Hành trình',
    'H\uFFFDnh Tr\uFFFDnh': 'Hành Trình',
    'L\uFFFD Tr\uFFFDnh': 'Lộ Trình',
    'L\uFFFD tr\uFFFDnh': 'Lộ trình',
    'Ch\uFFFbc n\uFFFDng': 'Chức năng', // "Ch?c nang" Wait, it's Ch\uFFFbc nang
    'Ch\uFFFbc nang': 'Chức năng',
    'C\uFFFDb nh\uFFFbt': 'Cập nhật',
    'C\uFFFDb nh\uFFFbt km': 'Cập nhật km',
    'Xang': 'Xăng',
    'D\uFFFBu': 'Dầu',
    'Xang/D\uFFFBu': 'Xăng/Dầu',
    '\uFFFBi\uFFFbn': 'Điện',
    'N\uFFFDm SX': 'Năm SX',
    'Nam SX': 'Năm SX',
    'chu k\uFFFD': 'chu kỳ',
    'qu\uFFFD h\uFFFbn': 'quá hạn',
    'Qu\uFFFD h\uFFFbn': 'Quá hạn',
    'Qu\uFFFD': 'Quá',
    'C\uFFFDn': 'Còn',
    'ng\uFFFDy': 'ngày',
    'Ng\uFFFDy': 'Ngày',
    'Th\uFFFDm xe': 'Thêm xe',
    'Th\uFFFDm xe m\uFFFDi': 'Thêm xe mới',
    'Ph\uFFFD & v\uFFFD': 'Phí & vé',
    'L\uFFFDch b\uFFFDo tr\uFFFD': 'Lịch bảo trì',
    'B\uFFFDo C\uFFFDo': 'Báo Cáo',
    '\uFFFDang luu...': 'Đang lưu...',
    'Nh\uFFFbp s\uFFFD KM m\uFFFDi': 'Nhập số KM mới',
    'Tang th\uFFFDm': 'Tăng thêm',
    'T\uFFFbng th\uFFFDm': 'Tăng thêm',
    'H\uFFFBy': 'Hủy',
    'Kh\uFFFDng th\uFFFD': 'Không thể',
    'Chua c\uFFFD d\uFFFD li\uFFFBu': 'Chưa có dữ liệu',
    'K\uFFFD ti\uFFFbp': 'Kỳ tiếp',
    'km d\uFFFD di': 'km đã đi', // km d di -> km đã đi
    'chuy\uFFFbn di': 'chuyến đi',
    'nam': 'năm',
    'v\uFFFD d\uFFFD 1 nam': 'ví dụ 1 năm',
    'kh\uFFFDng b\uFFFD': 'không bị',
    'ho\uFFFDn to\uFFFDn': 'hoàn toàn',
    'd\uFFFDng lu\uFFFDn': 'dùng luôn',
    'm\uFFFbc': 'mốc',
    'Ghi ch\uFFFDp': 'Ghi chép',
    '\uFFFD\uFFFD c\uFFFDb nh\uFFFbt': 'Đã cập nhật',
    'Pin & s\uFFFbc': 'Pin & sạc'
};

const pagesDir = 'c:/Users/minhq/Desktop/PROJECT-RUN/BOfin_app/src/pages/vehicles';
applyReplacements(path.join(pagesDir, 'AddVehicle.tsx'), replacementsAdd);
applyReplacements(path.join(pagesDir, 'index.tsx'), replacementsIndex);
