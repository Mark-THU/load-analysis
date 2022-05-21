# 负荷大数据分析软件
## 运行软件
软件运行命令为：
> python manage.py runserver 0.0.0.0:8000

之后在web框中输入`http://127.0.0.1:8000/index`即可注册或登录系统。

**配置python环境**

包括Django、pytorch、sklearn等（在运行时缺少什么再补充，建议使用conda环境）  
可以参考`requirements.txt`
## 部署软件
目前网页是通过Django的**debug**模式运行的，能够应用于一般需求，但是如果正式部署，则需要nginx+uWSGI+Django框架。  

**1. 安装nginx**  
> sudo yum install nginx  
sudo /etc/init.d/nginx start

之后可以通过访问80端口，检查nginx是否正常。  

**2. 为站点配置nginx**  

下载[uwsgi_params](https://github.com/nginx/nginx/blob/master/conf/uwsgi_params)，同时将其拷贝到项目目录中。

创建mysite_nginx.conf文件，写入以下内容
```
# mysite_nginx.conf

# the upstream component nginx needs to connect to
upstream django {
    # server unix:///path/to/your/mysite/mysite.sock; # for a file socket
    server 127.0.0.1:8001; # for a web port socket (we'll use this first)
}

# configuration of the server
server {
    # the port your site will be served on
    listen      8000;
    # the domain name it will serve for
    server_name 166.111.137.212; # substitute your machine's IP address or FQDN
    charset     utf-8;

    # max upload size
    client_max_body_size 75M;   # adjust to taste

    # Django media
    location /media  {
        alias /path/to/your/mysite/media;  # your Django project's media files - amend as required
    }

    location /static {
        alias /path/to/your/mysite/static; # your Django project's static files - amend as required (项目的static)
    }

    # Finally, send all non-media requests to the Django server.
    location / {
        uwsgi_pass  django;
        include     /path/to/your/mysite/uwsgi_params; # the uwsgi_params file you installed
    }
}
```
这个配置文件告诉nginx提供来自文件系统的媒体和静态文件，以及处理那些需要Django干预的请求。对于一个大型部署，让一台服务器处理静态/媒体文件，让另一台处理Django应用，被认为是一种很好的做法.

将文件链接到`/etc/nginx/sites-enabled`
> sudo ln -s  /path/to/your/mysite/mysite_nginx.conf  /etc/nginx/sites-enabled/

**3. 部署静态文件**

收集所有的Django静态文件到静态文件夹，编辑`mysite/settings.py`，添加
> STATIC_ROOT = os.path.join(BASE_DIR, "static/")  （这里的static root也是项目的）

然后运行`python manage.py collectstatic`（所有app的静态文件转移到项目静态文件）

**4. 重启nginx**
> sudo /etc/init.d/nginx restart

**5. 测试**

访问静态文件，查看nginx部署是否成功 （一定要测一下）。

**6. 连接Django**
> uwsgi --socket :8001 --module mysite.wsgi

## 各文件介绍
`./mysite/`：项目文件夹  

`./mysite/LoadAnalysis/`：APP文件夹（一个项目可以有很多个APP）  
`./mysite/LoadAnalysis/static/`：静态文件夹，包括js、css、图片、字体等静态文件  
`./mysite/LoadAnalysis/templates/`：前端的HTML文件  
`./mysite/LoadAnalysis/utils/`：python后端分析代码  
`./mysite/LoadAnalysis/urls.py`：网址$\rightarrow$后端处理文件  
`./mysite/LoadAnalysis/views.py`：后端处理文件

`./mysite/mysite/`：项目配置文件夹  
`./mysite/mysite/urls.py`：网址$\rightarrow$ APP映射关系  
`./mysite/mysite/settings.py`：项目配置文件

`./mysite/manage.py`：管理文件，运行Django项目需要使用该文件夹

## 增加功能
**1. 增加网页**

1. 设计前端HTML
2. `./mysite/LoadAnalysis/urls.py`中添加映射
3. `./mysite/LoadAnalysis/views.py`中处理前端需求，并给出回应

**2. 增加某一个网页的功能**

在该网页对应的js文件中增加JavaScript代码（js文件在`./mysite/LoadAnalysis/static/js/`中）

**3. 负荷预测增加模型**

参照`./mysite/LoadAnalysis/utils/load_predict.py`中模型训练与预测方法，增加模型，并在`return_dict`中新增输出。  
同时在`./mysite/LoadAnalysis/static/js/predict.js`中增加可视化代码。（可以参照原有数据可视化方式）
