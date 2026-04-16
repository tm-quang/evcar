import type { ShoppingItem } from '../lib/shoppingListService'

export type ShoppingListPreset = {
  id: string
  title: string
  type: 'market' | 'supermarket' | 'custom'
  items: Omit<ShoppingItem, 'id' | 'status' | 'display_order'>[]
}

/**
 * Preset danh sách mua sắm cho "Đi chợ"
 */
export const MARKET_SHOPPING_PRESET: ShoppingListPreset = {
  id: 'market-preset',
  title: 'Danh sách đi chợ',
  type: 'market',
  items: [
    // 1. Thịt tươi các loại
    { name: 'Thịt heo - Ba rọi', quantity: null, notes: null },
    { name: 'Thịt heo - Nạc dăm', quantity: null, notes: null },
    { name: 'Thịt heo - Thịt xay', quantity: null, notes: null },
    { name: 'Thịt heo - Sườn', quantity: null, notes: null },
    { name: 'Thịt gà - Nguyên con', quantity: null, notes: null },
    { name: 'Thịt gà - Đùi', quantity: null, notes: null },
    { name: 'Thịt gà - Cánh', quantity: null, notes: null },
    { name: 'Thịt gà - Phi lê', quantity: null, notes: null },
    { name: 'Thịt bò - Bắp', quantity: null, notes: null },
    { name: 'Thịt bò - Thăn', quantity: null, notes: null },
    { name: 'Thịt bò - Nạc xay', quantity: null, notes: null },

    // 2. Cá – Hải sản tươi
    { name: 'Cá lóc', quantity: null, notes: null },
    { name: 'Cá basa', quantity: null, notes: null },
    { name: 'Cá thu', quantity: null, notes: null },
    { name: 'Cá nục', quantity: null, notes: null },
    { name: 'Cá hồi', quantity: null, notes: null },
    { name: 'Tôm sú', quantity: null, notes: null },
    { name: 'Tôm thẻ', quantity: null, notes: null },
    { name: 'Tôm đất', quantity: null, notes: null },
    { name: 'Mực lá', quantity: null, notes: null },
    { name: 'Mực ống', quantity: null, notes: null },
    { name: 'Nghêu', quantity: null, notes: null },
    { name: 'Sò', quantity: null, notes: null },
    { name: 'Hàu', quantity: null, notes: null },

    // 3. Rau – Củ – Quả
    // Rau ăn lá
    { name: 'Rau muống', quantity: null, notes: null },
    { name: 'Cải xanh', quantity: null, notes: null },
    { name: 'Cải ngọt', quantity: null, notes: null },
    { name: 'Xà lách', quantity: null, notes: null },
    { name: 'Rau mồng tơi', quantity: null, notes: null },
    { name: 'Rau dền', quantity: null, notes: null },
    { name: 'Dưa leo', quantity: null, notes: null },
    { name: 'Rau thơm tổng hợp', quantity: null, notes: null },
    
    // Rau gia vị
    { name: 'Hành lá', quantity: null, notes: null },
    { name: 'Ngò rí', quantity: null, notes: null },
    { name: 'Húng quế', quantity: null, notes: null },
    { name: 'Rau răm', quantity: null, notes: null },
    { name: 'Tía tô', quantity: null, notes: null },

    // Củ – Quả
    { name: 'Cà rốt', quantity: null, notes: null },
    { name: 'Khoai tây', quantity: null, notes: null },
    { name: 'Khoai lang', quantity: null, notes: null },
    { name: 'Hành tây', quantity: null, notes: null },
    { name: 'Gừng', quantity: null, notes: null },
    { name: 'Tỏi', quantity: null, notes: null },
    { name: 'Ớt', quantity: null, notes: null },

    // Trái cây
    { name: 'Táo', quantity: null, notes: null },
    { name: 'Cam', quantity: null, notes: null },
    { name: 'Chuối', quantity: null, notes: null },
    { name: 'Dưa hấu', quantity: null, notes: null },
    { name: 'Thanh long', quantity: null, notes: null },

    // 4. Trứng
    { name: 'Trứng gà', quantity: null, notes: null },
    { name: 'Trứng vịt', quantity: null, notes: null },

    // 5. Đồ khô – Gia vị
    { name: 'Muối', quantity: null, notes: null },
    { name: 'Đường', quantity: null, notes: null },
    { name: 'Tiêu', quantity: null, notes: null },
    { name: 'Bột ngọt', quantity: null, notes: null },
    { name: 'Bột canh / Hạt nêm', quantity: null, notes: null },
    { name: 'Nước mắm', quantity: null, notes: null },
    { name: 'Nước tương', quantity: null, notes: null },
    { name: 'Dầu ăn', quantity: null, notes: null },
    { name: 'Tương ớt', quantity: null, notes: null },
    { name: 'Tương cà', quantity: null, notes: null },

    // 6. Đồ ăn làm sẵn tại chợ
    { name: 'Đậu hũ tươi', quantity: null, notes: null },
    { name: 'Bò viên / Cá viên', quantity: null, notes: null },
    { name: 'Chả lụa', quantity: null, notes: null },
    { name: 'Bánh cuốn, bánh ướt', quantity: null, notes: null },
    { name: 'Xôi – bánh sáng', quantity: null, notes: null },

    // 7. Đồ khô – Nguyên liệu nấu ăn
    { name: 'Bún tươi', quantity: null, notes: null },
    { name: 'Hủ tiếu tươi', quantity: null, notes: null },
    { name: 'Miến', quantity: null, notes: null },
    { name: 'Bánh phở', quantity: null, notes: null },
  ],
}

/**
 * Preset danh sách mua sắm cho "Siêu thị"
 */
export const SUPERMARKET_SHOPPING_PRESET: ShoppingListPreset = {
  id: 'supermarket-preset',
  title: 'Danh sách siêu thị',
  type: 'supermarket',
  items: [
    // 1. Đồ dùng cá nhân
    { name: 'Sữa tắm', quantity: null, notes: null },
    { name: 'Dầu gội', quantity: null, notes: null },
    { name: 'Dầu xả', quantity: null, notes: null },
    { name: 'Sữa rửa mặt', quantity: null, notes: null },
    { name: 'Kem đánh răng', quantity: null, notes: null },
    { name: 'Bàn chải đánh răng', quantity: null, notes: null },
    { name: 'Dao cạo râu', quantity: null, notes: null },
    { name: 'Lăn khử mùi', quantity: null, notes: null },
    { name: 'Khăn giấy ướt', quantity: null, notes: null },
    { name: 'Khăn giấy rút / Khăn giấy hộp', quantity: null, notes: null },
    { name: 'Băng vệ sinh', quantity: null, notes: null },

    // 2. Vệ sinh nhà cửa
    { name: 'Nước lau nhà', quantity: null, notes: null },
    { name: 'Nước rửa chén', quantity: null, notes: null },
    { name: 'Nước giặt / Bột giặt', quantity: null, notes: null },
    { name: 'Nước xả vải', quantity: null, notes: null },
    { name: 'Nước tẩy rửa bồn cầu', quantity: null, notes: null },
    { name: 'Nước vệ sinh kính', quantity: null, notes: null },
    { name: 'Nước diệt khuẩn', quantity: null, notes: null },
    { name: 'Túi rác', quantity: null, notes: null },
    { name: 'Miếng rửa chén', quantity: null, notes: null },
    { name: 'Găng tay rửa chén', quantity: null, notes: null },
    { name: 'Chổi / Cây lau nhà', quantity: null, notes: null },

    // 3. Đồ uống
    { name: 'Nước lọc đóng chai', quantity: null, notes: null },
    { name: 'Trà đóng chai', quantity: null, notes: null },
    { name: 'Cà phê lon / Cà phê hòa tan', quantity: null, notes: null },
    { name: 'Nước ngọt (Coca, Pepsi, 7Up…)', quantity: null, notes: null },
    { name: 'Nước trái cây đóng hộp', quantity: null, notes: null },
    { name: 'Sữa tươi', quantity: null, notes: null },
    { name: 'Sữa chua uống', quantity: null, notes: null },
    { name: 'Sữa hạt (hạt óc chó, mắc ca, đậu nành…)', quantity: null, notes: null },
    { name: 'Bia', quantity: null, notes: null },

    // 4. Đồ khô – Đồ đóng gói
    { name: 'Gạo', quantity: null, notes: null },
    { name: 'Mì gói', quantity: null, notes: null },
    { name: 'Nui', quantity: null, notes: null },
    { name: 'Ngũ cốc', quantity: null, notes: null },
    { name: 'Bánh mì sandwich', quantity: null, notes: null },
    { name: 'Bánh quy', quantity: null, notes: null },
    { name: 'Snack', quantity: null, notes: null },
    { name: 'Hạt điều, hạt dẻ, hạnh nhân', quantity: null, notes: null },
    { name: 'Đường', quantity: null, notes: null },
    { name: 'Muối', quantity: null, notes: null },
    { name: 'Bột ngọt', quantity: null, notes: null },
    { name: 'Tiêu', quantity: null, notes: null },
    { name: 'Dầu ăn', quantity: null, notes: null },
    { name: 'Nước mắm', quantity: null, notes: null },
    { name: 'Nước tương', quantity: null, notes: null },
    { name: 'Nước sốt (sốt cà, sốt mayo, tương ớt…)', quantity: null, notes: null },

    // 5. Đồ hộp – Đồ chế biến sẵn
    { name: 'Cá hộp', quantity: null, notes: null },
    { name: 'Thịt hộp', quantity: null, notes: null },
    { name: 'Rau củ đóng hộp', quantity: null, notes: null },
    { name: 'Cháo gói', quantity: null, notes: null },
    { name: 'Soup gói', quantity: null, notes: null },
    { name: 'Sữa đặc', quantity: null, notes: null },
    { name: 'Thạch / Pudding', quantity: null, notes: null },

    // 6. Đồ đông lạnh
    { name: 'Xúc xích', quantity: null, notes: null },
    { name: 'Há cảo – Hoành thánh – Dimsum', quantity: null, notes: null },
    { name: 'Khoai tây chiên', quantity: null, notes: null },
    { name: 'Tôm – Cá đông lạnh', quantity: null, notes: null },
    { name: 'Pizza đông lạnh', quantity: null, notes: null },
    { name: 'Thịt viên các loại', quantity: null, notes: null },

    // 7. Đồ tươi (siêu thị đóng gói sẵn)
    { name: 'Thịt khay', quantity: null, notes: null },
    { name: 'Cá fillet', quantity: null, notes: null },
    { name: 'Rau bọc', quantity: null, notes: null },
    { name: 'Trái cây nhập', quantity: null, notes: null },
    { name: 'Nấm', quantity: null, notes: null },

    // 8. Gia dụng nhỏ
    { name: 'Hộp đựng thực phẩm', quantity: null, notes: null },
    { name: 'Màng bọc thực phẩm', quantity: null, notes: null },
    { name: 'Giấy bạc nướng', quantity: null, notes: null },
    { name: 'Ống hút / Muỗng nĩa nhựa', quantity: null, notes: null },
    { name: 'Bao zip', quantity: null, notes: null },
    { name: 'Hộp đá, Ly nhựa', quantity: null, notes: null },
    { name: 'Bật lửa, Pin', quantity: null, notes: null },
  ],
}

/**
 * Tất cả các preset có sẵn
 */
export const SHOPPING_LIST_PRESETS: ShoppingListPreset[] = [
  MARKET_SHOPPING_PRESET,
  SUPERMARKET_SHOPPING_PRESET,
]

/**
 * Lấy preset theo ID
 */
export const getShoppingListPreset = (id: string): ShoppingListPreset | undefined => {
  return SHOPPING_LIST_PRESETS.find(preset => preset.id === id)
}


