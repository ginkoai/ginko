export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export const validators = {
  email: (email: string): ValidationResult => {
    const errors: string[] = []
    
    if (!email) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  password: (password: string): ValidationResult => {
    const errors: string[] = []
    
    if (!password) {
      errors.push('Password is required')
    } else {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long')
      }
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  required: (value: string, fieldName: string): ValidationResult => {
    const errors: string[] = []
    
    if (!value || value.trim() === '') {
      errors.push(`${fieldName} is required`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  minLength: (value: string, minLength: number, fieldName: string): ValidationResult => {
    const errors: string[] = []
    
    if (value && value.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters long`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  maxLength: (value: string, maxLength: number, fieldName: string): ValidationResult => {
    const errors: string[] = []
    
    if (value && value.length > maxLength) {
      errors.push(`${fieldName} must be no more than ${maxLength} characters long`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  url: (url: string): ValidationResult => {
    const errors: string[] = []
    
    if (url) {
      try {
        new URL(url)
      } catch {
        errors.push('Please enter a valid URL')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const validateSessionData = (data: {
  title: string
  description?: string
}): ValidationResult => {
  const allErrors: string[] = []
  
  const titleValidation = validators.required(data.title, 'Title')
  if (!titleValidation.isValid) {
    allErrors.push(...titleValidation.errors)
  } else {
    const titleLengthValidation = validators.maxLength(data.title, 100, 'Title')
    if (!titleLengthValidation.isValid) {
      allErrors.push(...titleLengthValidation.errors)
    }
  }
  
  if (data.description) {
    const descriptionValidation = validators.maxLength(data.description, 500, 'Description')
    if (!descriptionValidation.isValid) {
      allErrors.push(...descriptionValidation.errors)
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

export const validateUserProfile = (data: {
  full_name?: string
  username?: string
  website?: string
}): ValidationResult => {
  const allErrors: string[] = []
  
  if (data.full_name) {
    const nameValidation = validators.maxLength(data.full_name, 50, 'Full name')
    if (!nameValidation.isValid) {
      allErrors.push(...nameValidation.errors)
    }
  }
  
  if (data.username) {
    const usernameValidation = validators.minLength(data.username, 3, 'Username')
    if (!usernameValidation.isValid) {
      allErrors.push(...usernameValidation.errors)
    } else {
      const usernameLengthValidation = validators.maxLength(data.username, 30, 'Username')
      if (!usernameLengthValidation.isValid) {
        allErrors.push(...usernameLengthValidation.errors)
      }
    }
    
    // Check for valid username format (alphanumeric and underscores only)
    if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
      allErrors.push('Username can only contain letters, numbers, and underscores')
    }
  }
  
  if (data.website) {
    const websiteValidation = validators.url(data.website)
    if (!websiteValidation.isValid) {
      allErrors.push(...websiteValidation.errors)
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}