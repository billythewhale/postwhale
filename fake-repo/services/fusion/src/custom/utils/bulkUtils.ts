export function validateBulkBody(body: any) {
  if (!!body.shop || !Array.isArray(body) || body.length === 0 || body.length > 1000) {
    return {
      success: false,
      message: 'Body must be an array and length must be between 1 and 1000',
    };
  }
  return { success: true, message: 'Body is valid' };
}
