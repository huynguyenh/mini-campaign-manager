import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../index.js';

export class Recipient extends Model<InferAttributes<Recipient>, InferCreationAttributes<Recipient>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare name: string;
  declare created_at: CreationOptional<Date>;
}

Recipient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.CITEXT,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Recipient',
    tableName: 'recipients',
  },
);
