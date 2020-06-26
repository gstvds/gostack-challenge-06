import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const checkTransactionExist = await transactionsRepository.findOne({
      where: { id },
    });

    if (!checkTransactionExist) {
      throw new AppError("You can't delete an transaction that does'nt exists");
    }

    await transactionsRepository.remove(checkTransactionExist);
  }
}

export default DeleteTransactionService;
