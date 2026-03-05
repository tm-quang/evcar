/**
 * Translate Supabase authentication error messages to Vietnamese
 */
export const translateAuthError = (errorMessage: string): string => {
  const lowerMessage = errorMessage.toLowerCase()
  
  // Invalid credentials
  if (lowerMessage.includes('invalid login credentials') || 
      lowerMessage.includes('invalid credentials') ||
      lowerMessage.includes('email or password is incorrect')) {
    return 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.'
  }
  
  // User not found
  if (lowerMessage.includes('user not found') || lowerMessage.includes('no user found')) {
    return 'Không tìm thấy tài khoản. Vui lòng kiểm tra lại email.'
  }
  
  // Email already exists
  if (lowerMessage.includes('user already registered') || 
      lowerMessage.includes('email already exists') ||
      lowerMessage.includes('already registered')) {
    return 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.'
  }
  
  // Weak password
  if (lowerMessage.includes('password') && lowerMessage.includes('weak') ||
      lowerMessage.includes('password should be at least')) {
    return 'Mật khẩu quá yếu. Vui lòng sử dụng mật khẩu có ít nhất 6 ký tự.'
  }
  
  // Invalid email
  if (lowerMessage.includes('invalid email') || lowerMessage.includes('email format')) {
    return 'Định dạng email không hợp lệ. Vui lòng nhập email đúng định dạng.'
  }
  
  // Email not confirmed
  if (lowerMessage.includes('email not confirmed') || 
      lowerMessage.includes('email not verified') ||
      lowerMessage.includes('confirm your email')) {
    return 'Email chưa được xác nhận. Vui lòng kiểm tra email và xác nhận tài khoản.'
  }
  
  // Too many requests
  if (lowerMessage.includes('too many requests') || 
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many')) {
    return 'Quá nhiều yêu cầu. Vui lòng đợi một chút và thử lại.'
  }
  
  // Network errors
  if (lowerMessage.includes('network') || 
      lowerMessage.includes('connection') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('fetch')) {
    return 'Lỗi kết nối. Vui lòng kiểm tra kết nối internet và thử lại.'
  }
  
  // Generic authentication errors
  if (lowerMessage.includes('authentication') || 
      lowerMessage.includes('auth') ||
      lowerMessage.includes('unauthorized')) {
    return 'Lỗi xác thực. Vui lòng thử lại.'
  }
  
  // Return original message if no translation found
  return errorMessage
}


