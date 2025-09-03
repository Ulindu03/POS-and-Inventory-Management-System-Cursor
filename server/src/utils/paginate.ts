import { Model } from 'mongoose';

export async function paginate<T>(model: Model<T>, query: any, { page = 1, limit = 20, sort = { createdAt: -1 } }: { page?: number; limit?: number; sort?: any }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(limit) as any,
    model.countDocuments(query),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}
