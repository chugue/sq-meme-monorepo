import { Comment } from 'src/common/db/schema';

export interface CommentListDTO {
    comment: Comment;
    commentorProfileUrl: string;
    userName: string;
    hasUserLiked: boolean;
}

export interface CommentListRespDto {
    userTotalFunding: string;
    commentsListDTO: CommentListDTO[];
}
