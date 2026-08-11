import { z } from 'zod';

// Mínimo 8 caracteres, pelo menos 1 letra, 1 número e 1 caractere especial —
// mesma regra do painel de criação de senha no login (staff novo entra com
// o e-mail como senha temporária, troca aqui) e do reset por admin.
export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter no mínimo 8 caracteres, incluindo letra, número e caractere especial.';

export const passwordSchema = z
  .string()
  .min(8, PASSWORD_POLICY_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/\d/, PASSWORD_POLICY_MESSAGE)
  .regex(/[^A-Za-z0-9]/, PASSWORD_POLICY_MESSAGE);
