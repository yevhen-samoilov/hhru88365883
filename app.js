const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bodyParser = require('body-parser');
const Umzug = require('umzug');

// Инициализация Express
const app = express();
app.use(bodyParser.json());

// Подключение к базе данных
const sequelize = new Sequelize('postgres://username:password@localhost:5432/dbname', {
    logging: false // Отключить логирование SQL запросов
});

// Модель пользователя
const User = sequelize.define('User', {
    balance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0 }
    }
}, {
    timestamps: false
});

// Настройка миграций с Umzug
const umzug = new Umzug({
    migrations: {
        path: './migrations',
        params: [
            sequelize.getQueryInterface()
        ]
    },
    storage: 'sequelize',
    storageOptions: {
        sequelize: sequelize
    }
});

// Маршрут для обновления баланса пользователя
app.put('/user/:userId/balance', async (req, res) => {
    const { userId } = req.params;
    const { amount } = req.body;

    try {
        await sequelize.transaction(async (t) => {
            const user = await User.findByPk(userId, { transaction: t });
            if (!user) {
                return res.status(404).send('Пользователь не найден');
            }

            const newBalance = user.balance + amount;
            if (newBalance < 0) {
                return res.status(400).send('Недостаточно средств');
            }

            user.balance = newBalance;
            await user.save({ transaction: t });
            res.send('Баланс обновлен');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Синхронизация с базой данных и запуск сервера
sequelize.sync().then(() => {
    umzug.up().then(() => {
        app.listen(3000, () => console.log('Сервер запущен на порту 3000'));
    });
});
