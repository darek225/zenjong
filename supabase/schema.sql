CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT,
  email TEXT,
  elo_rating INTEGER,
  jade_balance INTEGER,
  pearl_balance INTEGER,
  equipped_tile_set TEXT,
  equipped_table_mat TEXT
);

CREATE TABLE shop_items (
  id UUID PRIMARY KEY,
  name TEXT,
  item_type TEXT,
  price INTEGER,
  currency_type TEXT,
  asset_url TEXT
);

CREATE TABLE user_inventory (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  item_id UUID REFERENCES shop_items(id),
  acquired_at TIMESTAMP
);