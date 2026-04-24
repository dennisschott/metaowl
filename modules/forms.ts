/**
 * @module Forms
 *
 * Form handling and validation for MetaOwl applications.
 */

import { reactive } from '@odoo/owl'

type FieldValues = Record<string, unknown>
type FormErrors = Record<string, string | null>
type FormFlags = Record<string, boolean>
type ValidationResult = true | string
type Validator = (value: unknown, values: FieldValues) => ValidationResult
type AsyncValidator = (value: unknown, values: FieldValues) => Promise<ValidationResult>

interface FieldConfig {
  default?: unknown
  validation?: Validator | Validator[]
  asyncValidation?: AsyncValidator
}

type FieldsConfig = Record<string, FieldConfig>
type SchemaFieldsConfig = Record<string, FieldConfig & { validation: Validator }>

interface SubmitOptions {
  validate?: boolean
}

interface RegisterProps {
  value: unknown
  onChange: (event: { target?: { value?: unknown } } | unknown) => void
  onBlur: () => void
  error: string | null
}

function getChangedValue(event: unknown): unknown {
  if (typeof event === 'object' && event !== null && 'target' in event) {
    const target = (event as { target?: { value?: unknown } }).target
    return target?.value ?? event
  }

  return event
}

export interface FormController {
  fields: FieldValues
  errors: FormErrors
  touched: FormFlags
  dirty: FormFlags
  validating: FormFlags
  isSubmitting: boolean
  isValidating: boolean
  submitCount: number
  readonly isValid: boolean
  readonly isDirty: boolean
  readonly isTouched: boolean
  setValue: (name: string, value: unknown) => void
  setTouched: (name: string) => void
  setAllTouched: () => void
  validateField: (name: string) => Promise<boolean>
  validate: () => Promise<boolean>
  reset: () => void
  handleSubmit: (onSubmit: (values: FieldValues, ...args: unknown[]) => unknown | Promise<unknown>, options?: SubmitOptions) => (...args: unknown[]) => Promise<void>
  register: (name: string) => RegisterProps
}

export function useForm(fieldsConfig: FieldsConfig = {}): FormController {
  const fields: FieldValues = {}
  const errors: FormErrors = {}
  const touched: FormFlags = {}
  const dirty: FormFlags = {}
  const validating: FormFlags = {}

  for (const [name, config] of Object.entries(fieldsConfig)) {
    const initialValue = config?.default ?? ''
    fields[name] = initialValue
    errors[name] = null
    touched[name] = false
    dirty[name] = false
    validating[name] = false
  }

  const state = reactive({
    fields,
    errors,
    touched,
    dirty,
    validating,
    isSubmitting: false,
    isValidating: false,
    submitCount: 0
  })

  async function validateField(name: string): Promise<boolean> {
    const config = fieldsConfig[name]
    if (!config?.validation) {
      state.errors[name] = null
      return true
    }

    const value = state.fields[name]
    const validatorList = Array.isArray(config.validation)
      ? config.validation
      : [config.validation]

    for (const validator of validatorList) {
      const result = validator(value, state.fields)
      if (result !== true) {
        state.errors[name] = result || 'Invalid'
        return false
      }
    }

    if (config.asyncValidation) {
      state.validating[name] = true
      state.isValidating = true

      try {
        const result = await config.asyncValidation(value, state.fields)
        if (result !== true) {
          state.errors[name] = result || 'Invalid'
          return false
        }
      } finally {
        state.validating[name] = false
        state.isValidating = Object.values(state.validating).some(Boolean)
      }
    }

    state.errors[name] = null
    return true
  }

  async function validateAll(): Promise<boolean> {
    const results = await Promise.all(
      Object.keys(fieldsConfig).map((name) => validateField(name))
    )
    return results.every(Boolean)
  }

  const controller: FormController = {
    fields: state.fields,
    errors: state.errors,
    touched: state.touched,
    dirty: state.dirty,
    validating: state.validating,
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    submitCount: state.submitCount,

    get isValid(): boolean {
      return Object.values(state.errors).every((error) => error === null)
    },

    get isDirty(): boolean {
      return Object.values(state.dirty).some(Boolean)
    },

    get isTouched(): boolean {
      return Object.values(state.touched).some(Boolean)
    },

    setValue(name: string, value: unknown): void {
      state.fields[name] = value
      state.dirty[name] = value !== (fieldsConfig[name]?.default ?? '')
    },

    setTouched(name: string): void {
      state.touched[name] = true
    },

    setAllTouched(): void {
      for (const name of Object.keys(fieldsConfig)) {
        state.touched[name] = true
      }
    },

    validateField,

    validate: validateAll,

    reset(): void {
      for (const [name, config] of Object.entries(fieldsConfig)) {
        state.fields[name] = config?.default ?? ''
        state.errors[name] = null
        state.touched[name] = false
        state.dirty[name] = false
      }
      state.isSubmitting = false
      state.submitCount = 0
    },

    handleSubmit(onSubmit, options = {}) {
      const { validate = true } = options

      return async (...args: unknown[]): Promise<void> => {
        state.isSubmitting = true
        state.submitCount++

        try {
          if (validate) {
            controller.setAllTouched()
            const isValid = await controller.validate()
            if (!isValid) {
              state.isSubmitting = false
              return
            }
          }

          await onSubmit({ ...state.fields }, ...args)
        } finally {
          state.isSubmitting = false
        }
      }
    },

    register(name: string): RegisterProps {
      return {
        value: state.fields[name],
        onChange: (event) => controller.setValue(name, getChangedValue(event)),
        onBlur: () => {
          controller.setTouched(name)
          void controller.validateField(name)
        },
        error: state.touched[name] ? state.errors[name] : null
      }
    }
  }

  return controller
}

export const validators = {
  required: (message = 'Required'): Validator => (value) => Boolean(value) || message,

  minLength: (min: number, message?: string): Validator => (value) =>
    ((value as { length?: number } | null | undefined)?.length ?? 0) >= min || message || `Min ${min} characters`,

  maxLength: (max: number, message?: string): Validator => (value) =>
    ((value as { length?: number } | null | undefined)?.length ?? 0) <= max || message || `Max ${max} characters`,

  min: (min: number, message?: string): Validator => (value) =>
    Number(value) >= min || message || `Min ${min}`,

  max: (max: number, message?: string): Validator => (value) =>
    Number(value) <= max || message || `Max ${max}`,

  email: (message = 'Invalid email'): Validator => (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '')) || message,

  url: (message = 'Invalid URL'): Validator => (value) =>
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})[/\w .-]*\/?$/.test(String(value ?? '')) || message,

  pattern: (regex: RegExp, message = 'Invalid format'): Validator => (value) =>
    regex.test(String(value ?? '')) || message,

  match: (field: string, message?: string): Validator => (value, values) =>
    value === values[field] || message || 'Fields do not match'
}

export function createSchema(schema: Record<string, Validator | Validator[]>): SchemaFieldsConfig {
  const fieldsConfig: SchemaFieldsConfig = {}

  for (const [name, fieldValidators] of Object.entries(schema)) {
    const validatorArray = Array.isArray(fieldValidators) ? fieldValidators : [fieldValidators]

    fieldsConfig[name] = {
      default: '',
      validation: (value, values) => {
        for (const validator of validatorArray) {
          const result = validator(value, values)
          if (result !== true) return result
        }
        return true
      }
    }
  }

  return fieldsConfig
}

export function fieldProps(form: FormController, name: string): RegisterProps {
  return {
    value: form.fields[name],
    error: form.touched[name] ? form.errors[name] : null,
    onChange: (value) => form.setValue(name, getChangedValue(value)),
    onBlur: () => {
      form.setTouched(name)
      void form.validateField(name)
    }
  }
}