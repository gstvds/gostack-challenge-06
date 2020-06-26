import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    let checkCategoryExist = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!checkCategoryExist) {
      checkCategoryExist = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(checkCategoryExist);
    }

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();

      if (total - value < 0) {
        throw new AppError(
          "You can't create an outcome that are greater than your total",
        );
      }
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: checkCategoryExist,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
