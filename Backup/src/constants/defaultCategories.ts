/**
 * Default Categories - Hardcoded categories for new users
 * These categories will be automatically synced to database when user first visits Categories page
 */

export type DefaultCategoryType = 'Chi tiêu' | 'Thu nhập'

export type DefaultCategory = {
  name: string
  type: DefaultCategoryType
  icon_id: string // UUID of icon in icons table, or empty string if using icon_url
  icon_url?: string | null // URL to PNG/SVG image (required for PNG icons from public/icons_categories)
  parent_id?: string | null
  display_order: number
  children?: DefaultCategory[]
}

// Default Expense Categories (Chi tiêu)
// Sử dụng icon_url để trỏ đến file PNG trong public/icons_categories
export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  // Parent categories
  {
    name: 'Ăn uống',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/an_1.png',
    parent_id: null,
    display_order: 1,
    children: [
      { name: 'Đi chợ, siêu thị', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/shoping_2.png', display_order: 1 },
      { name: 'Ăn tiệm, nhà hàng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/cua_hang.png', display_order: 2 },
      { name: 'Đồ uống', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/coffe.png', display_order: 3 },
      { name: 'Giao đồ ăn', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/giao_do_an.png', display_order: 4 },
      { name: 'Tiệc tùng, bạn bè', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/tiec_tung.png', display_order: 5 },
      { name: 'Đồ ăn vặt', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/pizza.png', display_order: 6 },
    ],
  },
  {
    name: 'Nhà cửa & hóa đơn',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/nha.png',
    parent_id: null,
    display_order: 2,
    children: [
      { name: 'Tiền thuê nhà', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/thu_nha.png', display_order: 1 },
      { name: 'Hóa đơn điện', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/dien.png', display_order: 2 },
      { name: 'Hóa đơn nước', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/nuoc.png', display_order: 3 },
      { name: 'Internet, truyền hình', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/router.png', display_order: 4 },
      { name: 'Gas', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/gas.png', display_order: 5 },
      { name: 'Phí quản lý, chung cư', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/hoa_don_1.png', display_order: 6 },
      { name: 'Sửa chữa nhà cửa', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/sua_nha_1.png', display_order: 7 },
      { name: 'Giúp việc, vệ sinh', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/ve_sinh_nha_cua.png', display_order: 8 },
    ],
  },
  {
    name: 'Di chuyển',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/di_chuyen.png',
    parent_id: null,
    display_order: 3,
    children: [
      { name: 'Xăng, dầu', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/tru_xang.png', display_order: 1 },
      { name: 'Gửi xe', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/parking.png', display_order: 2 },
      { name: 'Taxi, dịch vụ', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/taxi.png', display_order: 3 },
      { name: 'Vé tàu, Xe, máy bay', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/maybay.png', display_order: 4 },
      { name: 'Bảo dưỡng, Sửa chữa xe', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/sua_xe.png', display_order: 5 },
      { name: 'Phí cầu đường, lệ phí', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/phi_duong_bo.png', display_order: 6 },
      { name: 'Thuê xe', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/thue_xe.png', display_order: 7 },
    ],
  },
  {
    name: 'Sức khỏe',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/y_te.png',
    parent_id: null,
    display_order: 4,
    children: [
      { name: 'Thuốc men', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/thuoc_tay_1.png', display_order: 1 },
      { name: 'Khám bệnh', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/kham_benh.png', display_order: 2 },
      { name: 'Bảo hiểm y tế', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/bhyt.png', display_order: 3 },
      { name: 'Chăm sóc cá nhân', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/cham_soc_ca_nhan.png', display_order: 4 },
      { name: 'Thực phẩm chức năng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/thuoc_tay.png', display_order: 5 },
    ],
  },
  {
    name: 'Phát triển Bản thân',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/phat_trien.png',
    parent_id: null,
    display_order: 5,
    children: [
      { name: 'Học phí, khóa học', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/khoa_hoc.png', display_order: 1 },
      { name: 'Sách, tài liệu', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/sach.png', display_order: 2 },
      { name: 'Phần mềm, ứng dụng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/phan_mem.png', display_order: 4 },
      { name: 'Văn phòng phẩm', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/van_phong_pham.png', display_order: 5 },
    ],
  },
  {
    name: 'Gia đình & con cái',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/baby.png', // Reuse icon if needed
    parent_id: null,
    display_order: 6,
    children: [
      { name: 'Tả, sữa', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/binh_sua.png', display_order: 1 },
      { name: 'Tiêu vặt cho con', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/baby.png', display_order: 2 },
      { name: 'Học phí con', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/hoc_phi.png', display_order: 3 },
      { name: 'Quần áo, đồ dùng con', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/gau_bont_1.png', display_order: 4 },
    ],
  },
  {
    name: 'Hiếu hỉ & quan hệ',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/bat_tay.png',
    parent_id: null,
    display_order: 7,
    children: [
      { name: 'Quà tặng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/qua_tang.png', display_order: 1 },
      { name: 'Tiệc cưới, sinh nhật', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/nhan_cuoi.png', display_order: 2 },
      { name: 'Từ thiện', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/tu_thien.png', display_order: 3 },
    ],
  },
  {
    name: 'Hưởng thụ & giải trí',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/phim.png',
    parent_id: null,
    display_order: 8,
    children: [
      { name: 'Xem phim, nhạc', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/music.png', display_order: 1 },
      { name: 'Du lịch', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/du_lich.png', display_order: 2 },
    ],
  },
  {
    name: 'Mua sắm',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/shoping.png',
    parent_id: null,
    display_order: 9,
    children: [
      { name: 'Quần áo, giày dép', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/quan_ao_2.png', display_order: 1 },
      { name: 'Mỹ phẩm, làm đẹp', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/cay_son.png', display_order: 2 },
      { name: 'Đồ gia dụng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/may_giat.png', display_order: 3 },
      { name: 'Thiết bị điện tử, công nghệ', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/pc.png', display_order: 4 },
    ],
  },
  {
    name: 'Chi phí Tài chính',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/coin_chart.png',
    parent_id: null,
    display_order: 10,
    children: [
      { name: 'Phí ngân hàng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/bank.png', display_order: 1 },
      { name: 'Bảo hiểm', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/bao_hiem.png', display_order: 2 },
    ],
  },
  {
    name: 'Tiền ra',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/rut_tien.png',
    parent_id: null,
    display_order: 11,
  },
  {
    name: 'Trả nợ',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/money_2.png',
    parent_id: null,
    display_order: 12,
  },
  {
    name: 'Chi phí linh tinh',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/atm_2.png',
    parent_id: null,
    display_order: 99,
    children: [
      { name: 'Tiêu vặt', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/vi_tien.png', display_order: 1 },
      { name: 'Mất tiền, bị phạt', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/ticketcar.png', display_order: 2 },
      { name: 'Chi phí khác', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/money.png', display_order: 3 },
    ],
  },
]

// Default Income Categories (Thu nhập)
// Sử dụng icon_url để trỏ đến file PNG trong public/icons_categories
export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Lương',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/money_3.png',
    parent_id: null,
    display_order: 1,
  },
  {
    name: 'Thưởng',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/money_1.png',
    parent_id: null,
    display_order: 2,
  },
  {
    name: 'Tiền lãi',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/money_5.png',
    parent_id: null,
    display_order: 3,
  },
  {
    name: 'Lãi tiết kiệm',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/ong_heo.png',
    parent_id: null,
    display_order: 4,
  },
  {
    name: 'Đi vay',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/coin.png',
    parent_id: null,
    display_order: 5,
  },
  {
    name: 'Thu nợ',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/money_4.png',
    parent_id: null,
    display_order: 6,
  },
  {
    name: 'Được cho/tặng',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/donate.png',
    parent_id: null,
    display_order: 7,
  },
  {
    name: 'Tiền vào',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/income.png',
    parent_id: null,
    display_order: 8,
  },
  {
    name: 'Khác',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/traidat.png',
    parent_id: null,
    display_order: 99,
  },
]

// Helper function to get all default categories (flat list)
export const getAllDefaultCategories = (): DefaultCategory[] => {
  const all: DefaultCategory[] = []
  
  const processCategory = (cat: DefaultCategory, parentId: string | null = null) => {
    const categoryWithoutChildren = { ...cat }
    delete categoryWithoutChildren.children
    all.push({ ...categoryWithoutChildren, parent_id: parentId })
    
    if (cat.children) {
      cat.children.forEach((child) => {
        processCategory(child, cat.name) // Use name as temporary ID
      })
    }
  }
  
  DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => processCategory(cat))
  DEFAULT_INCOME_CATEGORIES.forEach((cat) => processCategory(cat))
  
  return all
}

// Helper function to sync default categories to database
export const syncDefaultCategoriesToDatabase = async (
  createCategoryFn: (payload: {
    name: string
    type: DefaultCategoryType
    icon_id: string
    icon_url?: string | null
    parent_id?: string | null
    display_order: number
  }) => Promise<{ id: string }>
): Promise<void> => {
  const parentIdMap = new Map<string, string>()
  
  // Sync expense categories
  for (const parent of DEFAULT_EXPENSE_CATEGORIES) {
    const parentResult = await createCategoryFn({
      name: parent.name,
      type: parent.type,
      icon_id: parent.icon_id,
      icon_url: parent.icon_url || null,
      parent_id: null,
      display_order: parent.display_order,
    })
    parentIdMap.set(parent.name, parentResult.id)
    
    if (parent.children) {
      for (const child of parent.children) {
        await createCategoryFn({
          name: child.name,
          type: child.type,
          icon_id: child.icon_id,
          icon_url: child.icon_url || null,
          parent_id: parentResult.id,
          display_order: child.display_order,
        })
      }
    }
  }
  
  // Sync income categories
  for (const parent of DEFAULT_INCOME_CATEGORIES) {
    await createCategoryFn({
      name: parent.name,
      type: parent.type,
      icon_id: parent.icon_id,
      icon_url: parent.icon_url || null,
      parent_id: null,
      display_order: parent.display_order,
    })
  }
}


