import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const readCSVStream = fs.createReadStream(path);

    const parseStream = csvParse({
      from_line: 2,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const checkCategoriesExists = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = checkCategoriesExists.map(
      (category: Category) => category.title,
    );

    const categoriesToAdd = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const addNewCategoriesToRepository = categoriesRepository.create(
      categoriesToAdd.map(title => ({ title })),
    );

    await categoriesRepository.save(addNewCategoriesToRepository);

    const totalCategories = [
      ...addNewCategoriesToRepository,
      ...checkCategoriesExists,
    ];

    const addNewTransactionsToRepository = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: totalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(addNewTransactionsToRepository);

    await fs.promises.unlink(path);

    return addNewTransactionsToRepository;
  }
}

export default ImportTransactionsService;
