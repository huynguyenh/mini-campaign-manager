import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type ForeignKey,
} from 'sequelize';
import { sequelize } from '../index.js';
import { User } from './User.js';
import { CAMPAIGN_STATUSES, type CampaignStatus } from '@mcm/shared';

export class Campaign extends Model<InferAttributes<Campaign>, InferCreationAttributes<Campaign>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare subject: string;
  declare body: string;
  declare status: CreationOptional<CampaignStatus>;
  declare scheduled_at: Date | null;
  declare created_by: ForeignKey<User['id']>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Campaign.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(200), allowNull: false },
    subject: { type: DataTypes.STRING(300), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM(...CAMPAIGN_STATUSES),
      allowNull: false,
      defaultValue: 'draft',
    },
    scheduled_at: { type: DataTypes.DATE, allowNull: true },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Campaign',
    tableName: 'campaigns',
    hooks: {
      beforeUpdate: (campaign) => {
        campaign.updated_at = new Date();
      },
    },
  },
);

User.hasMany(Campaign, { foreignKey: 'created_by', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'created_by', as: 'author' });
