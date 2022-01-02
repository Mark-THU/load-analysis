from django.shortcuts import render, redirect
from LoadAnalysis import models
from LoadAnalysis import forms
import pymysql
import json
from django.http import HttpResponse
from LoadAnalysis.utils.refine_analysis import refine_analysis_by_day, refine_analysis_by_week
from LoadAnalysis.utils.factors_analysis import factors_analysis_method
from LoadAnalysis.utils.load_predict import load_predict
from LoadAnalysis.utils.inner_analysis import inner_analysis_method
from LoadAnalysis.utils.cool_heat_load_analysis import cool_heat_load_analysis


# Create your views here.
def login(request):
    """
    登陆界面
    :param request:
    :return:
    """
    if request.session.get('is_login', None):
        # 不允许重复登录
        return redirect('/index/')
    if request.method == 'POST':
        login_form = forms.UserForm(request.POST.copy())
        msg = "请检查填写内容"  # 错误提示信息
        # 获取用户通过post 提交过来的数据
        if login_form.is_valid():
            username = login_form.cleaned_data.get('username')
            password = login_form.cleaned_data.get('password')
            try:
                user = models.User.objects.get(name=username)
            except:
                msg = '用户不存在'
                login_form.data['username'] = None  # 清除表单中的username
                return render(request, 'login.html', {'msg': msg, 'login_form': login_form})

            if user.password == password:
                request.session['is_login'] = True
                request.session['user_id'] = user.id
                request.session['user_name'] = user.name
                return redirect('/index/')
            else:
                msg = '密码不正确'
                login_form.focus_on_password()  # 聚焦到password
                return render(request, 'login.html', {'msg': msg, 'login_form': login_form})
        else:
            return render(request, 'login.html', {'msg': msg, 'login_form': login_form})

    login_form = forms.UserForm()
    return render(request, 'login.html', {'login_form': login_form})


def register(request):
    """
    注册界面
    :param request:
    :return:
    """
    if request.session.get('is_login', None):
        return redirect('/index/')

    if request.method == 'POST':
        register_form = forms.RegisterForm(request.POST.copy())
        message = "请检查填写的内容！"
        if register_form.is_valid():
            username = register_form.cleaned_data.get('username')
            password1 = register_form.cleaned_data.get('password1')
            password2 = register_form.cleaned_data.get('password2')

            if password1 != password2:
                message = '两次输入的密码不同！'
                return render(request, 'register.html', {'msg': message, 'register_form': register_form})
            else:
                same_name_user = models.User.objects.filter(name=username)
                if same_name_user:
                    message = '用户名已经存在'
                    return render(request, 'register.html', {'msg': message, 'register_form': register_form})

                new_user = models.User()
                new_user.name = username
                new_user.password = password1
                new_user.save()

                return redirect('/login/')
        else:
            return render(request, 'register.html', {'msg': message, 'register_form': register_form})
    register_form = forms.RegisterForm()
    return render(request, 'register.html', {'register_form': register_form})


def logout(request):
    """
    登出界面
    :param request:
    :return:
    """
    request.session['is_login'] = False
    return redirect('/login/')


def index(request):
    """
    主页
    :param request:
    :return:
    """
    if request.session.get('is_login', None):
        return render(request, 'refine_analysis_index_V2.html', {'user': request.session['user_name']})
    else:
        return redirect('/login/')


def index_get_data(request):
    """
    index中查询功能，通过ajax获取数据
    :param request:
    :return:
    """
    search_kw = request.GET.get('search_kw', None)
    district_id = request.GET.get('district_id', None)
    # 连接数据库
    db = pymysql.connect("localhost", "root", "fit4-305", "webdata")
    cursor = db.cursor()
    rows = []
    # search_kw, load 或者是integrate
    # 返回最大日期和最小日期
    if district_id:
        sql = "select max(time), min(time) from {}".format(search_kw + district_id)
        cursor.execute(sql)
        results = cursor.fetchone()
        rows.append({'max_time': str(results[0]), 'min_time': str(results[1])})
    elif search_kw:
        sql = "select district_id, district_name from district_tables_index where {} = 'true'".format(search_kw)
        cursor.execute(sql)
        results = cursor.fetchall()
        for i, result in enumerate(results):
            rows.append({"district_id": result[0], "district_name": result[1]})

    cursor.close()
    db.close()
    return HttpResponse(json.dumps(rows))


def refine_analysis_index(request):
    if request.session.get('is_login', None):
        return render(request, 'refine_analysis_index_V2.html', {'user': request.session['user_name']})
    else:
        return redirect('/login/')


def factors_analysis_index(request):
    if request.session.get('is_login', None):
        return render(request, 'factors_analysis_index_V2.html', {'user': request.session['user_name']})
    else:
        return redirect('/login/')


def predict_index(request):
    if request.session.get('is_login', None):
        return render(request, 'predict_index_V2.html', {'user': request.session['user_name']})
    else:
        return redirect('/login/')


def inner_analysis_index(request):
    if request.session.get('is_login', None):
        return render(request, 'inner_analysis_index_V2.html', {'user': request.session['user_name']})
    else:
        return redirect('/login/')


def cool_heat_load_index(request):
    if request.session.get('is_login', None):
        return render(request, 'cool_heat_load_index_V2.html', {'user': request.session['user_name']})
    else:
        return redirect('/login/')


def refine_analysis(request, district_id):
    # 只用于ajax返回数据
    day_or_week = request.GET.get('day_or_week', None)
    time = request.GET.get('time', None)
    if day_or_week == 'week':
        return_dict = refine_analysis_by_week(district_id, time)
        return HttpResponse(json.dumps(return_dict))
    else:
        # 返回日负荷，归一化日负荷，以及负荷的标签, 聚类类别数
        return_dict = refine_analysis_by_day(district_id, time)
        return HttpResponse(json.dumps(return_dict))


def factors_analysis(request, district_id):
    # 只用返回ajax json数据
    time_start = request.GET.get('start_time', None) + '-01'
    time_end = request.GET.get('end_time', None) + '-31'
    return_dict = factors_analysis_method(district_id, time_start, time_end)
    return HttpResponse(json.dumps(return_dict))


def predict(request, district_id):
    # 只返回ajax json数据
    time = request.GET.get('time', None)
    return_dict = load_predict(district_id, time)
    return HttpResponse(json.dumps(return_dict))


def inner_analysis(request, district_id):
    # 只用返回ajax json数据
    time = request.GET.get('time', None)
    return_dict = inner_analysis_method(district_id, time)
    return HttpResponse(json.dumps(return_dict))


def cool_heat_load(request, district_id):
    time = request.GET.get('time', None)
    return_dict = cool_heat_load_analysis(district_id, time)
    return HttpResponse(return_dict)


def test(request):
    return render(request, 'header_V2.html', {'user': request.session['user_name']})
