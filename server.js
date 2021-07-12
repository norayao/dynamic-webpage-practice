var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if(!port){
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function(request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) {
        queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
    }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    let status_code = response.statusCode;

    console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery);

    const session = JSON.parse(fs.readFileSync('./db/session.json').toString());

    if(path === 'sign_in' && method === 'POST'){
        // Achieving data from DB
        const user_data = JSON.parse(fs.readFileSync('./db/user.json'));
        // Prepare for large file segments upload
        const file_array = [];
        // Push file segments into array
        request.on('data', (chunk) =>{
            file_array.push(chunk)
        });
        // When uploading finished
        request.on('end',() =>{
            const file_string = Buffer.concat(file_array).toString();
            const file_obj = JSON.parse(file_string);

            // Using find() to get username and password
            const user = user_data.find(
                (user) => user.username === file_obj.username && user.password === find_obj.password
            );

            // Comparison Failure
            if(user === undefined){
                response.statusCode = 400;
                response.setHeader("Content-Type", "text/json; charset=utf-8");
            }
            // Comparison Succeed
            else{
                response.statusCode = 200;
                // 生成随机数转成36进制，再截取部分
                const random = Math.random().toString(36).slice(-6);
                // set session
                session[random] = {user_id: user.id};
                fs.writeFileSync('./db/user.json', JSON.stringify(session));
                // use cookie to store session id
                response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
            }
            response.end();
        });
    }


    else if(path === 'home.html'){
        const cookie = request.headers['cookie'];
        let session_id;

        // 已知 cookie 为 name=value pairs, 通过';'分割转化为数组，
        // 找到 index 为 session id 的一项，
        // 随后去除多余的 '='
        try{
            session_id = cookie.split(';').filter(s => s.indexOf("session_id=") >= 0)[0].split("=")[1];
        }
        catch (error){
            console.log(error);
        }

        if (session_id && session[session_id]) {
            const user_id = session[session_id].user_id
            const user_data = JSON.parse(fs.readFileSync("./db/user.json"));
            const user = user_data.find(user => user.id === user_id);
            const homeHtml = fs.readFileSync("./public/home.html").toString();
            let string = ''
            if (user) {
                string = homeHtml.replace("{{loginStatus}}", "已登录")
                    .replace('{{user.username}}', user.username)
            }
            response.write(string);
        } else {
            const homeHtml = fs.readFileSync("./public/home.html").toString();
            const string = homeHtml.replace("{{loginStatus}}", "未登录")
                .replace('{{user.username}}', '')
            response.write(string);
        }

        response.end();
     }

    else if (path === '/register' && method === 'POST') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');

        // Achieving data from DB
        const user_data = JSON.parse(fs.readFileSync('./db/user.json'));
        // Prepare for large file segments upload
        const file_array = [];
        // Push file segments into array
        request.on('data', (chunk) =>{
            file_array.push(chunk)
        });
        // When uploading finished
        request.on('end',() =>{
            const file_string = Buffer.concat(file_array).toString();
            const file_obj = JSON.parse(file_string);

            const last_user = user_data.length > 1 ? user_data[user_data.length - 1] : '';
            const new_user = {
                id: last_user ? last_user.id + 1 : 1,
                username: file_obj.username,
                password: file_obj.password
            }
            user_data.push(new_user);
            fs.writeFileSync("./db/user.json", JSON.stringify(user_data));
            response.end();
        });
    }

    else{
        // 自动导向index.html
        const file_path = path === '/' ? '/index.html' : path;
        const separator = file_path.lastIndexOf('.');
        const suffix = file_path.substring(separator + 1);

        // hash 设置suffix对应response header
        const file_types = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'png': 'image/png',
            'jpg': 'image/jpeg'
        }
        response.setHeader('Content-Type', `${file_types[suffix] || 'text/html'};charset=utf-8`);


        let content
        try {
            content = fs.readFileSync(`./public${file_path}`)
        } catch (error) {
            content = '文件不存在'
            response.statusCode = 404
        }
        response.write(content)
        response.end()
    }
});

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)