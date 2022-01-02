# _*_ coding: utf-8 _*_
'''
Create on 2020/10/06

@author: mark

负荷数据和气候数据的对齐
加入日类型，月类型
日天气因素最值与均值
历史天气因素
'''
import pymysql
import pandas as pd
import jpype
from sqlalchemy import create_engine
from chinese_calendar import is_workday


def get_load_data(district_name, start_time, end_time):
    jvm_path = jpype.getDefaultJVMPath()
    class_path = 'LoadElectricalData.jar'
    if not jpype.isJVMStarted():
        jpype.startJVM(jvm_path, "-ea", "-Djava.class.path=%s" % class_path)
    JDClass = jpype.JClass("GetElectricalLoad")
    jd = JDClass()
    jd.main([district_name, start_time, end_time])
    jpype.shutdownJVM()


def integrate_data(district_id):
    # load data
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    load_table_name = 'load_' + district_id
    climate_table_name = 'climate_' + district_id
    load_data = pd.read_sql_table(table_name=load_table_name, con=engine, index_col='time')
    climate_data = pd.read_sql_table(table_name=climate_table_name, con=engine, index_col='time')

    # concat climate and load
    integrate_data = pd.concat((climate_data, load_data), axis=1, join='inner')

    # concat integrate and economy indicator
    sql = 'select * from economy_indicator where district = ' + district_id
    economy_data = pd.read_sql_query(sql, engine, index_col='time')
    economy_data.drop(['district'], axis=1, inplace=True)
    integrate_data = pd.concat((economy_data, integrate_data), axis=1, join='outer')
    integrate_data.fillna(method='ffill', axis=0, inplace=True)

    # 增加日类型、季节类型数据
    integrate_data.insert(0, 'time', integrate_data.index)
    integrate_data = integrate_data.apply(add_day_type, axis=1)
    # 增加天气因素最值与均值
    data_groupby_day = integrate_data.groupby([pd.Grouper(key='time', freq='D')])
    integrate_data = data_groupby_day.apply(add_weather_day_factors)
    integrate_data.to_sql(name='integrate_' + district_id, con=engine, index=False, if_exists='replace')
    # 建立integrate_id_chara表，
    # 包括了日天气特征和日负荷特性指标
    data_chara = integrate_data[
        ['time', 'maxTem', 'meanTem', 'minTem', 'maxHum', 'meanHum', 'minHum', 'maxWinclass', 'meanWinclass',
         'minWinclass', 'maxTembody', 'meanTembody', 'minTembody', 'load']]
    data_chara_groupby_day = data_chara.groupby([pd.Grouper(key='time', freq='D')])
    data_chara = data_chara_groupby_day.apply(get_feature_by_day).reset_index()
    data_comp = data_chara.dropna(how='any', axis=0)
    data_comp.to_sql(name='integrate_' + district_id + '_chara', con=engine, index=False, if_exists='replace')


def add_day_type(datum):
    datum['dayType'] = float(is_workday(datum.time)) + 1
    datum['seasonType'] = float((datum.time.month - 1) // 3 + 1)
    return datum


def add_weather_day_factors(group):
    group['maxTem'] = group.tem.max()
    group['meanTem'] = group.tem.mean()
    group['minTem'] = group.tem.min()
    group['maxHum'] = group.hum.max()
    group['meanHum'] = group.hum.mean()
    group['minHum'] = group.hum.min()
    group['maxWinclass'] = group.winclass.max()
    group['meanWinclass'] = group.winclass.mean()
    group['minWinclass'] = group.winclass.min()
    group['maxTembody'] = group.tembody.max()
    group['meanTembody'] = group.tembody.mean()
    group['minTembody'] = group.tembody.min()
    return group


def get_feature_by_day(group):
    """
    获取每日天气特征，日负荷特性
    :param group: 每日数据
    :return:
    """
    tmp = pd.Series([], dtype='float')
    tmp['maxTem'] = group.maxTem.mean()
    tmp['meanTem'] = group.meanTem.mean()
    tmp['minTem'] = group.minTem.mean()
    tmp['maxHum'] = group.maxHum.mean()
    tmp['meanHum'] = group.meanHum.mean()
    tmp['minHum'] = group.minHum.mean()
    tmp['maxWinclass'] = group.maxWinclass.mean()
    tmp['meanWinclass'] = group.meanWinclass.mean()
    tmp['minWinclass'] = group.minWinclass.mean()
    tmp['maxTembody'] = group.maxTembody.mean()
    tmp['meanTembody'] = group.meanTembody.mean()
    tmp['minTembody'] = group.minTembody.mean()

    load_max = group.load.max()
    load_min = group.load.min()
    load_mean = group.load.mean()
    load_ratio = load_mean / load_max
    load_min_ratio = load_min / load_max
    load_delta = load_max - load_min
    load_delta_ratio = load_delta / load_max
    tmp['maxLoad'] = load_max
    tmp['minLoad'] = load_min
    tmp['meanLoad'] = load_mean
    tmp['ratioLoad'] = load_ratio
    tmp['minRatioLoad'] = load_min_ratio
    tmp['deltaLoad'] = load_delta
    tmp['deltaRatioLoad'] = load_delta_ratio

    return tmp


if __name__ == '__main__':
    # district_ids = ['0101110000', '0101120000', '0101310000', '0101500000']
    # for district_id in district_ids:
    #     integrate_data(district_id)
    get_load_data("'浙江电网'", "2017", "2020")
