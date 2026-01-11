import { snakifyObj, camelizeObj } from './util';

describe('snakifyObj', () => {
  it('should convert camelCase keys to snake_case', () => {
    const input = {
      sessionId: '123',
      shopId: 'test-shop',
      userId: 'user-1',
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      session_id: '123',
      shop_id: 'test-shop',
      user_id: 'user-1',
    });
  });

  it('should not add leading underscore for keys starting with uppercase', () => {
    const input = {
      SessionId: '123',
      ShopId: 'test-shop',
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      session_id: '123',
      shop_id: 'test-shop',
    });
  });

  it('should handle nested objects', () => {
    const input = {
      sessionId: '123',
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      session_id: '123',
      metadata: {
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      },
    });
  });

  it('should handle consecutive uppercase letters', () => {
    const input = {
      XMLHttpRequest: 'test',
      HTTPSConnection: 'secure',
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      xml_http_request: 'test',
      https_connection: 'secure',
    });
  });

  it('should handle keys starting with uppercase', () => {
    const input = {
      SessionId: '123',
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      session_id: '123',
    });
    expect(result.session_id).toBe('123');
  });

  it('should preserve non-object values', () => {
    const input = {
      stringValue: 'test',
      numberValue: 42,
      booleanValue: true,
      nullValue: null,
      dateValue: new Date('2024-01-01'),
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      string_value: 'test',
      number_value: 42,
      boolean_value: true,
      null_value: null,
      date_value: new Date('2024-01-01'),
    });
  });

  it('should handle empty objects', () => {
    const input = {};
    const result = snakifyObj(input);
    expect(result).toEqual({});
  });

  it('should handle keys with numbers', () => {
    const input = {
      item1Id: '1',
      item2Name: 'Item 2',
      test123Value: 'test',
    };
    const result = snakifyObj(input);
    expect(result).toEqual({
      item1_id: '1',
      item2_name: 'Item 2',
      test123_value: 'test',
    });
  });
});

describe('camelizeObj', () => {
  it('should convert snake_case keys to camelCase', () => {
    const input = {
      session_id: '123',
      shop_id: 'test-shop',
      user_id: 'user-1',
    };
    const result = camelizeObj(input);
    expect(result).toEqual({
      sessionId: '123',
      shopId: 'test-shop',
      userId: 'user-1',
    });
  });
});
