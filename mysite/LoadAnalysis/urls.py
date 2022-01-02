from django.urls import path

from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('logout/', views.logout, name='logout'),
    path('index/', views.index, name='index'),
    path('refine_analysis/', views.refine_analysis_index, name='refine_analysis_index'),
    path('factors_analysis/', views.factors_analysis_index, name='factors_analysis_index'),
    path('predict/', views.predict_index, name='predict_index'),
    path('inner_analysis/', views.inner_analysis_index, name='inner_analysis_index'),
    path('cool_heat_load/', views.cool_heat_load_index, name='cool_heat_load_index'),
    path('cool_heat_load/<district_id>/', views.cool_heat_load, name='cool_heat_load'),
    path('refine_analysis/<district_id>/', views.refine_analysis, name='refine_analysis'),
    path('factors_analysis/<district_id>/', views.factors_analysis, name='factors_analysis'),
    path('predict/<district_id>/', views.predict, name='predict'),
    path('inner_analysis/<district_id>/', views.inner_analysis, name='inner_analysis'),
    path('indexgetdata/', views.index_get_data, name='index_get_data'),
    path('test/', views.test, name='test'),
]
