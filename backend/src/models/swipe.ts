// src/models/swipe.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../database'; // Assuming your sequelize instance is exported from database.ts

export class Swipe extends Model {
  public id!: number;
  public swiperid!: number;
  public swipedid!: number;
  public direction!: 'left' | 'right';
  public createdat!: Date;
}

Swipe.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    swiperid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    swipedid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    direction: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['left', 'right']], // Ensures that direction can only be 'left' or 'right'
      },
    },
    createdat: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false, // Automatically sets to the current date/time if not provided
    },
  },
  {
    sequelize,
    tableName: 'swipes',
    timestamps: false, // Disabling Sequelize's automatic handling of `createdAt` and `updatedAt`
  }
);
