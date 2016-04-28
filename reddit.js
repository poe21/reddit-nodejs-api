var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;

module.exports = function RedditAPI(conn) {
  return {
    createUser: function(user, callback) {
      
      // first we have to hash the password...
      bcrypt.hash(user.password, HASH_ROUNDS, function(err, hashedPassword) {
        if (err) {
          callback(err);
        }
        else {
          conn.query(
            'INSERT INTO `users` (`username`,`password`, `createdAt`) VALUES (?, ?, ?)', [user.username, hashedPassword, null],
            function(err, result) {
              if (err) {
                /*
                There can be many reasons why a MySQL query could fail. While many of
                them are unknown, there's a particular error about unique usernames
                which we can be more explicit about!
                */
                if (err.code === 'ER_DUP_ENTRY') {
                  callback(new Error('A user with this username already exists'));
                }
                else {
                  callback(err);
                }
              }
              else {
                /*
                Here we are INSERTing data, so the only useful thing we get back
                is the ID of the newly inserted row. Let's use it to find the user
                and return it
                */
                conn.query(
                  'SELECT `id`, `username`, `createdAt`, `updatedAt` FROM `users` WHERE `id` = ?', [result.insertId],
                  function(err, result) {
                    if (err) {
                      callback(err);
                    }
                    else {
                      /*
                      Finally! Here's what we did so far:
                      1. Hash the user's password
                      2. Insert the user in the DB
                      3a. If the insert fails, report the error to the caller
                      3b. If the insert succeeds, re-fetch the user from the DB
                      4. If the re-fetch succeeds, return the object to the caller
                      */
                        callback(null, result[0]);
                    }
                  }
                );
              }
            }
          );
        }
      });
    },
    createPost: function(post, callback) {
      conn.query(
        'INSERT INTO `posts` (`userId`, `title`, `url`, `createdAt`) VALUES (?, ?, ?, ?)', [post.userId, post.title, post.url, null],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            Post inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT `id`,`title`,`url`,`userId`, `createdAt`, `updatedAt` FROM `posts` WHERE `id` = ?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    getAllPosts: function(options, callback) {
      // In case we are called without an options parameter, shift all the parameters manually
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      
      conn.query(`
        SELECT p.id AS post_id, p.title AS post_title, p.url AS post_url, p.userId AS post_userId, 
          p.createdAt AS post_createdAt, p.updatedAt AS post_updatedAt, u.id AS user_id,
          u.username AS user_username, u.createdAt AS user_createdAt, u.updatedAt AS user_updatedAt
        FROM posts p
        JOIN users u ON p.userId=u.id
        ORDER BY p.createdAt DESC
        LIMIT ? OFFSET ?
        `, [limit, offset],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            var postsArray = [];
            var newPostObj = {};
            results.map(function(postObj){
              newPostObj = {
                id: postObj.post_id,
                title: postObj.post_title,
                url: postObj.post_url,
                createdAt: postObj.post_createdAt,
                updatedAt: postObj.post_updatedAt,
                userId: postObj.post_userId,
                user: {
                  id: postObj.user_id,
                  username: postObj.user_username,
                  createdAt: postObj.user_createdAt,
                  updatedAt: postObj.user_updatedAt
                }
              };
            postsArray.push(newPostObj);
            });
          callback(null, postsArray);
          }
        }
      );
    },
    getAllPostsForUser: function(userId, options, callback) {
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      
      conn.query(`
        SELECT  
          posts.id AS post_id, posts.title AS post_title, posts.url AS post_url, posts.userId AS post_userId, 
          posts.createdAt AS post_createdAt, posts.updatedAt AS post_updatedAt, users.id AS user_id,
          users.username AS user_username, users.createdAt AS user_createdAt, users.updatedAt AS user_updatedAt
        FROM posts
        JOIN users ON posts.userId=users.id
        WHERE posts.userId=?
        ORDER BY posts.createdAt DESC
        LIMIT ? OFFSET ?
        `, [userId, limit, offset],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            var postsArray = [];
            var newPostObj = {};
            results.map(function(postObj){
              newPostObj = {
                id: postObj.post_id,
                title: postObj.post_title,
                url: postObj.post_url,
                createdAt: postObj.post_createdAt,
                updatedAt: postObj.post_updatedAt,
                userId: postObj.post_userId,
                user: {
                  id: postObj.user_id,
                  username: postObj.user_username,
                  createdAt: postObj.user_createdAt,
                  updatedAt: postObj.user_updatedAt
                }
              };
            postsArray.push(newPostObj);
            });
          callback(null, postsArray);
          }
        }
      );
    }
  };
};
