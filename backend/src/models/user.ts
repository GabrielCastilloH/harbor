import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database'; // Import the sequelize instance

// Define the User model
class User extends Model {
  id!: number;
  first_name!: string;
  last_name!: string;
  age!: number;
  graduation_year!: number;
  major!: string;
  email!: string;
}

// Initialize the User model
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    graduation_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    major: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Ensure email is unique
    },
  },
  {
    sequelize, // Pass the Sequelize instance
    modelName: 'User', // Model name
    tableName: 'users', // The table name in the database
    timestamps: false, // Disable auto timestamps if you don’t need them
  }
);

export { User };
