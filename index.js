const HyperExpress = require("hyper-express");
const mysql = require("mysql2/promise");

// Загрузка переменных окружения из .env файла
require("dotenv").config();

// Подключение к MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Формирует условие для SQL-запроса на основе переданных ключей.
 * @param {Array} keys - Массив ключей для условия.
 * @returns {string} - Строка с условием WHERE или пустая строка.
 */
const getQueryForCondition = (keys) => {
  if (keys.length === 0) {
    return "";
  }
  return " WHERE " + [...keys].map((element) => `${element} = ?`).join(" AND ");
};

/**
 * Формирует строку для SQL-запроса на вставку на основе переданных ключей.
 * @param {Array} keys - Массив ключей для вставки.
 * @returns {string} - Строка с присвоениями для INSERT или пустая строка.
 */
const getQueryForInsert = (keys) => {
  if (keys.length === 0) {
    return "";
  }
  return [...keys].map((element) => `${element} = ?`).join(",");
};

const app = new HyperExpress.Server();

//---------------------------------------

// POST /create
// Создание записи (CREATE)
app.post("/create", async (req, res) => {
  try {
    const { full_name, role, efficiency } = await req.json();
    if ([full_name, role, efficiency].includes(undefined)) {
      res.status(400).json({
        success: false,
        result: {
          error: `Undefined fields that shouldn't be null`,
        },
      });
      return;
    }

    const [result] = await db.execute(
      "INSERT INTO users (full_name, role, efficiency) VALUES (?, ?, ?)",
      [full_name, role, efficiency]
    );
    res.status(201).json({
      success: true,
      result: {
        id: result.insertId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: true,
      result: {
        error: error.message,
      },
    });
  }
});

//---------------------------------------

//GET /get

// Получение всех записей (READ)
app.get("/get", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM users ${getQueryForCondition(
        Object.keys(req.query_parameters)
      )}`,
      Object.values(req.query_parameters)
    );
    res.status(200).json({
      success: true,
      result: {
        users: rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: true,
      result: {
        error: error.message,
      },
    });
  }
});

// Получение записи по ID (READ by ID)
app.get("/get/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length > 0) {
      res.json({
        success: true,
        result: {
          users: [rows[0]],
        },
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({
      success: true,
      result: {
        error: error.message,
      },
    });
  }
});

//---------------------------------------

//PATCH /update

// Обновление записи по ID (UPDATE)
app.patch("/update/:id", async (req, res) => {
  try {
    const request_body = await req.json();
    if (Object.keys(request_body).length === 0) {
      res.status(400).json({
        success: false,
        result: {
          error: `Empty body`,
        },
      });
      return;
    }
    const [result] = await db.execute(
      `UPDATE users SET ${getQueryForInsert(
        Object.keys(request_body)
      )} WHERE id = ?`,
      [...Object.values(request_body), req.params.id]
    );

    if (result.affectedRows > 0) {
      const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
        req.params.id,
      ]);
      res.json({
        success: true,
        result: {
          users: rows[0],
        },
      });
    } else {
      res.status(404).json({
        success: false,
        result: {
          error: "User not found",
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      result: {
        error: error.message,
      },
    });
  }
});

// ----------------------------------------

// DELETE /delete

// Удаление всех записей (DELETE)
app.delete("/delete", async (req, res) => {
  try {
    const [result] = await db.execute("TRUNCATE users");
    if (result.affectedRows > 0) {
      res.json({
        success: true,
      });
    } else {
      res.status(404).json({
        success: false,
        result: {
          error: "Empty table",
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      result: {
        error: error.message,
      },
    });
  }
});

// Удаление записи по ID (DELETE)
app.delete("/delete/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);

    const [result] = await db.execute("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        result: rows[0],
      });
    } else {
      // Обработка случая, если пользователь не найден
      res.status(404).json({
        success: false,
        result: {
          error: "User not found",
        },
      });
    }
  } catch (error) {
    // Обработка ошибок сервера
    res.status(500).json({
      success: true,
      result: {
        error: error.message,
      },
    });
  }
});
// ----------------------------------------

// Запуск сервера
app.listen(3000, () => console.log("Live on :3000"));
