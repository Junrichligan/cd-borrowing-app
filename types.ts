export interface CD {
  id: string;
  title: string;
  artist: string;
  copies: number;
}

export interface BorrowedCD {
  id: string;
  cdId: string;
  title: string;
  borrower: string;
  borrowDate: string;
  dueDate: string;
  penalty: number;
}