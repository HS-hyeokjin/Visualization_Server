// express 모듈 
var express = require('express');

var app = express();
 
//body-parser 모듈을 사용 bodyParser 미들웨어의 여러 옵션 중에 하나로 false 값일 시 
//node.js에 기본으로 내장된 queryString, true 값일 시 따로 설치가 필요한 npm qs 라이브러리를 사용한다.
app.use(express.urlencoded({extended: false}));
 
// 파일 저장 fs, df 패키지
var fs = require("fs");
var df = require('dataformat');
 
// mysql 패키지 
mysql = require('mysql');
var connection = mysql.createConnection({
    host:'localhost',
    user:'sensor',
    password:'qwer1234',
    database:'data'
})
connection.connect();
 
function insert_sensor(id, temp, hum, sound, infra)
{
    obj = {};
    obj.id = id;
    obj.temp = temp;
    obj.hum = hum;
    obj.sound = sound;
    obj.infra = infra;
    obj.date = df(new Date(), "yyyy-mm-dd HH:MM:ss");
 
    var d = JSON.stringify(obj);
    ret = " "+ temp + hum +"="+ infra;
 
    console.log("RET "+ ret);

    fs.appendFile("Data.txt", d+'\n', function(err) {
        if(err) console.log("File Write Err: %j", r);
    });
    return(ret);
}
 
function do_get_post(cmd, r, req, res)
{
    console.log(cmd +" %j", r);
    ret_msg = "{serial:"+ r.serial +",user:"+ r.user;
 
    if (r.format == '2') {
        var items = r.items.split(',');
 
        for (var i=0; i< items.length; i++) {
            if (items[i].length < 3) continue;
            var v = items[i].split('-');
            ret_msg += insert_sensor(r.user, v[1], v[2], v[0], r.serial, req.connection.remoteAddress);
        }
    }
 
    ret_msg += "}";
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('X-ACK:' + ret_msg);
}
//전체 데이터를 response
app.get("/output", function(req, res){
  console.log("params=" + req.query);
  var out = 'select * from sensors where date > date_sub(now(), INTERVAL 1 DAY)';
  connection.query(out, function(err, rows, cols){
    if(err){
        throw err;
    }
    console.log("Got " + rows.length +" records");
    console.log("data : " + rows);
    res.json(rows);
});
});
//가장 최근에 들어온 값 한개의 데이터
app.post("/latest", function(req, res){
    console.log("params=" + req.query);
    var t = 'select * from sensors order by date desc limit 1';
    connection.query(t, function(err, rows, cols){
      if(err){
          throw err;
      }    
      console.log("Got " + rows.length +" records");
      console.log("data : " + rows);
      res.json(rows);
  });
  });
//기기 id 별로 데이터를 response 
  app.post("/id/:type", function(req, res){
    console.log("params=" + req.query);
    let {type} = req.params;
    var s3 = "select * from sensors where id="+type+"";
    connection.query(s3, function(err, rows, cols){
      if(err){
          throw err;
      }
      console.log("Got " + rows.length +" records");
      console.log("data : " + rows);
      res.json(rows);
  });
  });
//24시간 이내에 데이터를 html View 로 표형식
app.get("/data", function(req, res){
    console.log("params=" + req.query);
    var qstr = 'select * from sensors where date > date_sub(now(), INTERVAL 1 DAY)';
    connection.query(qstr, function(err, rows, cols){
        if(err){
            throw err;
        }
 
        console.log("Got " + rows.length +" records");
        var html = "<!doctype html><html><body>";
        html += "<H1> Sensor Data for Last 24 Hours </H1>";
        html += "<table border=1 cellpadding=3 cellspacing=0>";
        html += "<tr><td>ID<td>Temperature<td>Humidity<td>Sound<td>Infra<td>Time Stamp";
 
        for(var i =0; i < rows.length ; i++)
        {
            html += "<tr><td>"+ JSON.stringify(rows[i]['id'])+"<td>"+ JSON.stringify(rows[i]['value'])+"<td>"+ JSON.stringify(rows[i]['hum'])
            +"<td>"+ JSON.stringify(rows[i]['sound'])+"<td>"+ JSON.stringify(rows[i]['infra'])+"<td>"+ JSON.stringify(rows[i]['date']);
        }
        html += "</table>";
        html += "</body></html>";
        res.send(html);
    });
});
 
// server:3000/logone 에 GET 방식 mysql 작업 수행
// log.txt 파일에 데이터를 저장
app.get('/input', function(req, res){
    var i = 0;
    i++;
 
    r = {};
    r.id = req.query.id;
    r.temp = req.query.temp;
    r.hum = req.query.hum;
    r.sound = req.query.sound;
    r.infra = req.query.infra;

 
    var query = connection.query('insert into sensors set ?', r, function(err, rows,cols){
        if(err)
        {
            throw err;
        }
        console.log("[+]SQL injection is done!");
    });
    
    var date = new Date();
    fs.appendFile("log.txt",JSON.stringify(req.query) +", "+req.ip+", "+ date +"\n" ,function(err){
    if(err){
            return console.log(err);
        }
    })
    r = req.query;
    do_get_post("GET", r, req, res);
});
 
 
//  3000번 포트
var server = app.listen(3000, function(){
    var host = server.address().address
    var port = server.address().port
    console.log('listening at http://%s:%s',host,port)
});