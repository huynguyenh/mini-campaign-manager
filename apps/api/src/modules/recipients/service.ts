import { Recipient } from '../../db/models/index.js';
import type { CreateRecipientInput, Paginated } from '@mcm/shared';

export async function list(page: number, pageSize: number): Promise<Paginated<Recipient>> {
  const { rows, count } = await Recipient.findAndCountAll({
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { data: rows, page, pageSize, total: count };
}

/** Upsert-by-email: returns existing recipient if the email is already registered. */
export async function createOrGet(input: CreateRecipientInput): Promise<Recipient> {
  const [recipient] = await Recipient.findOrCreate({
    where: { email: input.email },
    defaults: { email: input.email, name: input.name },
  });
  return recipient;
}
