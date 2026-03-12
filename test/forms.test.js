import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useForm, validators, createSchema } from '../modules/forms.js'

describe('Forms', () => {
  describe('useForm', () => {
    it('creates form with initial values', () => {
      const form = useForm({
        name: { default: 'John' },
        email: { default: '' }
      })

      expect(form.fields.name).toBe('John')
      expect(form.fields.email).toBe('')
    })

    it('tracks dirty state', () => {
      const form = useForm({
        name: { default: '' }
      })

      expect(form.isDirty).toBe(false)
      form.setValue('name', 'Jane')
      expect(form.isDirty).toBe(true)
    })

    it('tracks touched state', () => {
      const form = useForm({
        name: { default: '' }
      })

      expect(form.isTouched).toBe(false)
      form.setTouched('name')
      expect(form.isTouched).toBe(true)
    })

    it('validates with sync validators', async () => {
      const form = useForm({
        name: {
          default: '',
          validation: (v) => v.length >= 3 || 'Min 3 chars'
        }
      })

      // Invalid
      form.setValue('name', 'Jo')
      const isValid1 = await form.validateField('name')
      expect(isValid1).toBe(false)
      expect(form.errors.name).toBe('Min 3 chars')

      // Valid
      form.setValue('name', 'John')
      const isValid2 = await form.validateField('name')
      expect(isValid2).toBe(true)
      expect(form.errors.name).toBe(null)
    })

    it('validates all fields', async () => {
      const form = useForm({
        name: {
          default: '',
          validation: (v) => !!v || 'Required'
        },
        email: {
          default: '',
          validation: (v) => !!v || 'Required'
        }
      })

      const isValid = await form.validate()
      expect(isValid).toBe(false)
      expect(form.errors.name).toBe('Required')
      expect(form.errors.email).toBe('Required')
    })

    it('handles submit', async () => {
      const onSubmit = vi.fn()
      const form = useForm({
        name: { default: 'John' }
      })

      const handleSubmit = form.handleSubmit(onSubmit)
      await handleSubmit()

      expect(onSubmit).toHaveBeenCalledWith({ name: 'John' })
    })

    it('validates before submit', async () => {
      const onSubmit = vi.fn()
      const form = useForm({
        name: {
          default: '',
          validation: (v) => !!v || 'Required'
        }
      })

      const handleSubmit = form.handleSubmit(onSubmit)
      await handleSubmit()

      expect(onSubmit).not.toHaveBeenCalled()
      expect(form.errors.name).toBe('Required')
    })

    it('resets form', () => {
      const form = useForm({
        name: { default: 'John' }
      })

      form.setValue('name', 'Jane')
      form.setTouched('name')
      form.reset()

      expect(form.fields.name).toBe('John')
      expect(form.isDirty).toBe(false)
      expect(form.isTouched).toBe(false)
    })

    it('supports register method', () => {
      const form = useForm({
        name: { default: '' }
      })

      const props = form.register('name')

      expect(props.value).toBe('')
      expect(typeof props.onChange).toBe('function')
      expect(typeof props.onBlur).toBe('function')
    })
  })

  describe('validators', () => {
    describe('required', () => {
      it('validates non-empty', () => {
        const validator = validators.required()
        expect(validator('')).toBe('Required')
        expect(validator('test')).toBe(true)
      })

      it('allows custom message', () => {
        const validator = validators.required('Field required')
        expect(validator('')).toBe('Field required')
      })
    })

    describe('minLength', () => {
      it('validates min length', () => {
        const validator = validators.minLength(3)
        expect(validator('ab')).toBe('Min 3 characters')
        expect(validator('abc')).toBe(true)
      })
    })

    describe('maxLength', () => {
      it('validates max length', () => {
        const validator = validators.maxLength(5)
        expect(validator('abcdef')).toBe('Max 5 characters')
        expect(validator('abc')).toBe(true)
      })
    })

    describe('email', () => {
      it('validates email format', () => {
        const validator = validators.email()
        expect(validator('invalid')).toBe('Invalid email')
        expect(validator('test@example.com')).toBe(true)
      })
    })

    describe('match', () => {
      it('validates field match', () => {
        const validator = validators.match('password', 'Passwords must match')
        expect(validator('secret', { password: 'different' })).toBe('Passwords must match')
        expect(validator('secret', { password: 'secret' })).toBe(true)
      })
    })
  })

  describe('createSchema', () => {
    it('creates form config from schema', () => {
      const schema = createSchema({
        name: [validators.required(), validators.minLength(3)],
        email: validators.email()
      })

      expect(schema.name).toBeDefined()
      expect(schema.email).toBeDefined()

      // Test validation
      const nameValidator = schema.name.validation
      expect(nameValidator('ab', {})).toBe('Min 3 characters')
      expect(nameValidator('john', {})).toBe(true)
    })

    it('accepts single validator', () => {
      const schema = createSchema({
        email: validators.email()
      })

      const emailValidator = schema.email.validation
      expect(emailValidator('test', {})).toBe('Invalid email')
      expect(emailValidator('test@example.com', {})).toBe(true)
    })
  })
})
