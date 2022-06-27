export const pageCacheKey = (id: string) => 'pagecache#' + id;
export const usersKey = (userId: string) => 'users#' + userId;

export const sessionKey = (sessionId: string) => `sessions#${sessionId}`;
export const itemsKey = (itemId: string) => `items#${itemId}`;
