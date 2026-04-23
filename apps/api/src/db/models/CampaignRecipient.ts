import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type ForeignKey,
} from 'sequelize';
import { sequelize } from '../index.js';
import { Campaign } from './Campaign.js';
import { Recipient } from './Recipient.js';
import { RECIPIENT_STATUSES, type RecipientStatus } from '@mcm/shared';

export class CampaignRecipient extends Model<
  InferAttributes<CampaignRecipient>,
  InferCreationAttributes<CampaignRecipient>
> {
  declare id: CreationOptional<string>;
  declare campaign_id: ForeignKey<Campaign['id']>;
  declare recipient_id: ForeignKey<Recipient['id']>;
  declare status: CreationOptional<RecipientStatus>;
  declare sent_at: Date | null;
  declare opened_at: Date | null;
}

CampaignRecipient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    campaign_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'campaigns', key: 'id' },
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'recipients', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM(...RECIPIENT_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    opened_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'CampaignRecipient',
    tableName: 'campaign_recipients',
    indexes: [{ unique: true, fields: ['campaign_id', 'recipient_id'] }],
  },
);

Campaign.hasMany(CampaignRecipient, { foreignKey: 'campaign_id', as: 'campaignRecipients', onDelete: 'CASCADE' });
CampaignRecipient.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

Recipient.hasMany(CampaignRecipient, { foreignKey: 'recipient_id', as: 'campaignRecipients', onDelete: 'CASCADE' });
CampaignRecipient.belongsTo(Recipient, { foreignKey: 'recipient_id', as: 'recipient' });
