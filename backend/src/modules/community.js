const { db } = require("../shared/data");

function communityProfile(user) {
  return { id: user.id, name: user.name, avatar: user.avatar || "", level: user.level, showProfile: user.showProfile !== false };
}

function publicComment(comment, viewer) {
  const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
  return {
    id: comment.id,
    userId: comment.userId,
    user: comment.user,
    avatar: comment.avatar || "",
    content: comment.content,
    likes: Number(comment.likes || 0),
    liked: Boolean(viewer && likedBy.includes(viewer.id))
  };
}

function publicPost(post, viewer) {
  const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
  const comments = (post.comments || []).filter((comment) => comment.status === "approved" && (comment.userId === 0 || db.users.some((user) => user.id === comment.userId)));
  return {
    id: post.id,
    userId: post.userId,
    author: post.author,
    avatar: post.avatar || "",
    title: post.title,
    content: post.content,
    image: post.image || "",
    likes: Number(post.likes || 0),
    liked: Boolean(viewer && likedBy.includes(viewer.id)),
    comments: comments.map((comment) => publicComment(comment, viewer))
  };
}

module.exports = { communityProfile, publicComment, publicPost };
