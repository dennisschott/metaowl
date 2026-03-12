/**
 * @module Forms
 *
 * Form handling and validation for MetaOwl applications.
 *
 * Features:
 * - useForm() hook for form state
 * - Field-level validation
 * - Schema validation (Zod-compatible)
 * - Error display
 * - Field dirty/touched tracking
 * - Async validation support
 *
 * @example
 * import { useForm } from 'metaowl'
 *
 * const form = useForm({
 *   name: { default: '', validation: (v) => v.length > 2 || 'Min 3 chars' },
 *   email: { default: '', validation: (v) => /^[^\s@]+@[^\s@]+$/.test(v) || 'Invalid' }
 * })
 *
 * form.handleSubmit((values) => {
 *   console.log(values.name, values.email)
 * })
 */

import { reactive } from '@odoo/owl'

/**
 * Create a form controller.
 *
 * @param {object} fieldsConfig - Field configurations
 * @returns {FormController}
 *
 * @example
 * const form = useForm({
 *   name: { default: '', validation: (v) => v.length > 0 || 'Required' },
 *   email: {
 *     default: '',
 *     validation: [
 *       (v) => !!v || 'Required',
 *       (v) => /.+@.+/.test(v) || 'Invalid email'
 *     ],
 *     asyncValidation: async (v) => await checkEmail(v) || 'Taken'
 *   }
 * })
 */
export function useForm(fieldsConfig = {}) {
  const fields = {}
  const errors = {}
  const touched = {}
  const dirty = {}
  const validating = {}

  // Initialize field states
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

  /**
   * Validate a single field.
   *
   * @param {string} name
   * @returns {Promise<boolean>}
   */
  async function validateField(name) {
    const config = fieldsConfig[name]
    if (!config?.validation) {
      state.errors[name] = null
      return true
    }

    const value = state.fields[name]
    const validators = Array.isArray(config.validation)
      ? config.validation
      : [config.validation]

    // Sync validation
    for (const validator of validators) {
      const result = validator(value, state.fields)
      if (result !== true) {
        state.errors[name] = result || 'Invalid'
        return false
      }
    }

    // Async validation
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

  /**
   * Validate all fields.
   *
   * @returns {Promise<boolean>}
   */
  async function validateAll() {
    const results = await Promise.all(
      Object.keys(fieldsConfig).map(name => validateField(name))
    )
    return results.every(Boolean)
  }

  return {
    // State (reactive)
    fields: state.fields,
    errors: state.errors,
    touched: state.touched,
    dirty: state.dirty,
    validating: state.validating,
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    submitCount: state.submitCount,

    // Computed
    get isValid() {
      return Object.values(state.errors).every(e => e === null)
    },

    get isDirty() {
      return Object.values(state.dirty).some(Boolean)
    },

    get isTouched() {
      return Object.values(state.touched).some(Boolean)
    },

    // Methods
    /**
     * Update a field value.
     *
     * @param {string} name
     * @param {*} value
     */
    setValue(name, value) {
      state.fields[name] = value
      state.dirty[name] = value !== (fieldsConfig[name]?.default ?? '')
    },

    /**
     * Mark field as touched.
     *
     * @param {string} name
     */
    setTouched(name) {
      state.touched[name] = true
    },

    /**
     * Mark all fields as touched.
     */
    setAllTouched() {
      for (const name of Object.keys(fieldsConfig)) {
        state.touched[name] = true
      }
    },

    /**
     * Validate a field.
     *
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    validateField,

    /**
     * Validate all fields.
     *
     * @returns {Promise<boolean>}
     */
    validate: validateAll,

    /**
     * Reset form to initial state.
     */
    reset() {
      for (const [name, config] of Object.entries(fieldsConfig)) {
        state.fields[name] = config?.default ?? ''
        state.errors[name] = null
        state.touched[name] = false
        state.dirty[name] = false
      }
      state.isSubmitting = false
      state.submitCount = 0
    },

    /**
     * Create submit handler.
     *
     * @param {Function} onSubmit - Callback with form values
     * @param {object} [options]
     * @param {boolean} [options.validate=true] - Validate before submit
     * @returns {Function} Submit handler
     */
    handleSubmit(onSubmit, options = {}) {
      const { validate = true } = options

      return async (...args) => {
        state.isSubmitting = true
        state.submitCount++

        try {
          if (validate) {
            this.setAllTouched()
            const isValid = await this.validate()
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

    /**
     * Get field props for binding.
     *
     * @param {string} name
     * @returns {object} Bindable props
     */
    register(name) {
      return {
        value: state.fields[name],
        onChange: (e) => this.setValue(name, e.target?.value ?? e),
        onBlur: () => {
          this.setTouched(name)
          this.validateField(name)
        },
        error: state.touched[name] ? state.errors[name] : null
      }
    }
  }
}

/**
 * Common validators.
 */
export const validators = {
  required: (message = 'Required') => (v) => !!v || message,

  minLength: (min, message) => (v) =>
    (v?.length ?? 0) >= min || message || `Min ${min} characters`,

  maxLength: (max, message) => (v) =>
    (v?.length ?? 0) <= max || message || `Max ${max} characters`,

  min: (min, message) => (v) =>
    Number(v) >= min || message || `Min ${min}`,

  max: (max, message) => (v) =>
    Number(v) <= max || message || `Max ${max}`,

  email: (message = 'Invalid email') => (v) =>
    /^[^\s@]+@[^\s@]+$/.test(v) || message,

  url: (message = 'Invalid URL') => (v) =>
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})[/\w .-]*\/?$/.test(v) || message,

  pattern: (regex, message = 'Invalid format') => (v) =>
    regex.test(v) || message,

  match: (field, message) => (v, values) =>
    v === values[field] || message || 'Fields do not match'
}

/**
 * Create validation schema from config.
 *
 * @param {object} schema
 * @returns {object}
 *
 * @example
 * const schema = createSchema({
 *   name: [validators.required(), validators.minLength(3)],
 *   email: [validators.required(), validators.email()]
 * })
 *
 * const form = useForm(schema)
 */
export function createSchema(schema) {
  const fieldsConfig = {}

  for (const [name, validators] of Object.entries(schema)) {
    const validatorArray = Array.isArray(validators) ? validators : [validators]

    fieldsConfig[name] = {
      default: '',
      validation: (v, values) => {
        for (const validator of validatorArray) {
          const result = validator(v, values)
          if (result !== true) return result
        }
        return true
      }
    }
  }

  return fieldsConfig
}

/**
 * Field component props helper.
 *
 * @param {object} form - Form controller from useForm
 * @param {string} name - Field name
 * @returns {object} Props for input component
 */
export function fieldProps(form, name) {
  return {
    value: form.fields[name],
    error: form.touched[name] ? form.errors[name] : null,
    onChange: (value) => form.setValue(name, value),
    onBlur: () => {
      form.setTouched(name)
      form.validateField(name)
    }
  }
}
