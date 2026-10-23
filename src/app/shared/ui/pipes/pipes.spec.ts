import { FormControl, FormGroup } from '@angular/forms';
import { validationMessage } from '../forms/validation-messages';
import { matchFieldsValidator } from '../forms/validators';
import { CopCurrencyPipe, formatCop } from './cop-currency.pipe';
import { DateEsPipe, formatDateEs } from './date-es.pipe';

const norm = (s: string) => s.replace(/\s/g, ' ');

describe('pipes', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(norm(formatCop(1234567))).toBe('$ 1.234.567');
    expect(norm(new CopCurrencyPipe().transform('2500.6'))).toBe('$ 2.501');
    expect(formatCop(null)).toBe('—');
    expect(formatCop('abc')).toBe('—');
  });

  it('formatea fechas en español', () => {
    expect(formatDateEs('2026-10-16T12:00:00')).toBe('16/10/2026');
    expect(new DateEsPipe().transform(new Date(2026, 9, 16), 'long')).toContain('octubre');
    expect(formatDateEs('no-fecha')).toBe('—');
  });
});

describe('validación', () => {
  it('traduce errores estándar', () => {
    expect(validationMessage({ required: true })).toBe('Este campo es obligatorio.');
    expect(validationMessage({ minlength: { requiredLength: 8, actualLength: 3 } })).toBe(
      'Debe tener al menos 8 caracteres.',
    );
    expect(validationMessage({ max: { max: 100 } })).toBe('El valor máximo es 100.');
    expect(validationMessage({ custom: 'Mensaje propio' })).toBe('Mensaje propio');
    expect(validationMessage({ raro: true })).toBe('El valor no es válido.');
    expect(validationMessage({ required: true }, { required: 'Obligatorio' })).toBe('Obligatorio');
    expect(validationMessage(null)).toBeNull();
  });

  it('matchFieldsValidator marca mismatch en la confirmación', () => {
    const group = new FormGroup(
      { password: new FormControl('abc12345'), confirm: new FormControl('otra') },
      { validators: matchFieldsValidator('password', 'confirm') },
    );
    expect(group.hasError('mismatch')).toBe(true);
    expect(group.get('confirm')!.hasError('mismatch')).toBe(true);
    group.get('confirm')!.setValue('abc12345');
    expect(group.valid).toBe(true);
    expect(group.get('confirm')!.errors).toBeNull();
  });
});
