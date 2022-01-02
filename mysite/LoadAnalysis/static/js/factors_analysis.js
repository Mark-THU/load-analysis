const feature_names = ['日最高温度', '日平均温度', '日最低温度', '日最高湿度', '日平均湿度', '日最低湿度',
    '日最高风级', '日平均风级', '日最低风级', '日最高体感温度', '日平均体感温度', '日最低体感温度'];
const chara_names = ['日最大负荷', '日最小负荷', '日平均负荷', '日负荷率', '日最小负荷率', '日峰谷差', '日峰谷差率'];
let all_data;
$(document).ready(function () {
    //设置电网option
    districtOptionSet();
    // 根据电网设置可选择日期
    $('#district-select').change(function () {
        dateSet();
    })
    // 分析按钮被点击
    $("#analysis-button").click(function () {
        let yearMonthStart = $('#datepicker-yearMonth-start').val();
        let yearMonthEnd = $('#datepicker-yearMonth-end').val();
        let district_id = $('#district-select').val();
        if (yearMonthStart.length === 0 || yearMonthEnd.length === 0) {
            alert('请选择月份');
        } else if (yearMonthEnd < yearMonthStart) {
            alert('请重新选择截止月份');
        } else {
            // 设置画布点击后显示正在加载
            $('.myEcharts').each(function () {
                let id = $(this).attr('id');
                let myChart = echarts.init(document.getElementById(id));
                myChart.showLoading({
                    text: '正在加载数据···',
                    color: '#007d7b',
                    textColor: '#000',
                    maskColor: 'rgba(255, 255, 255, 0.2)',
                    zlevel: 0,
                });
            });
            $.ajax({
                url: "/factors_analysis/" + district_id,
                type: 'GET',
                data: {'start_time': yearMonthStart, 'end_time': yearMonthEnd},
                dateType: "json",
                success: function (result) {
                    all_data = JSON.parse(result);
                    // 绘制特征、负荷相关系数图
                    drawFeatureLoadCorr(all_data['corr']);
                    // 设置特征选项
                    featureOptionSet(all_data['comp']);
                    // 绘制特征、负荷比较图
                    drawFeatureLoadComp(all_data['comp'])
                    // 设置特征改变时，重新绘制
                    $('#feature-select').change(function () {
                        drawFeatureLoadComp(all_data['comp']);
                    });
                    // 绘制相关关系与因果关系
                    drawCharaLoadCorr(all_data['chara_load_corr']['chara_load_corr_pearson'], 'pearson');
                    drawCharaLoadCorr(all_data['chara_load_corr']['chara_load_corr_spearman'], 'spearman');
                    drawCharaLoadCorr(all_data['chara_load_corr']['chara_load_corr_gra'], 'gra');
                    drawCharaLoadCorr(all_data['cause'], 'cause');
                }
            });
        }
    })
})

function districtOptionSet() {
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'integrate_'},
        dataType: "json",
        success: function (result) {
            let select = $("#district-select");
            select.empty();
            let option;
            for (let i = 0; i < result.length; i++) {
                option = $("<option></option>").text(result[i].district_name);
                option.attr('value', result[i].district_id);
                select.append(option);
            }
            dateSet(init = true);
        }
    });
}

function dateSet(init = false) {
    let district_id = $('#district-select').val();
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'integrate_', 'district_id': district_id},
        dataType: "json",
        success: function (result) {
            $('#yearMonth-start').datePicker({
                format: 'YYYY-MM',
                language: 'zh',
                min: result[0].min_time,
                max: result[0].max_time,
                hide: function () {
                    let min_time = $('#datepicker-yearMonth-start').val();
                    $('#yearMonth-end').datePicker({
                        format: 'YYYY-MM',
                        language: 'zh',
                        min: min_time,
                        max: result[0].max_time,
                    });
                },
            });
            $('#datepicker-yearMonth-start').val(result[0].max_time.slice(0, 7));
            $('#datepicker-yearMonth-end').val(result[0].max_time.slice(0, 7));
            if (init) {
                $('#analysis-button').click();
            }
        }
    })
}

function drawFeatureLoadCorr(data) {
    let myChart = echarts.init(document.getElementById('corr-feature-load'));
    myChart.hideLoading();
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        tooltip: {
            trigger: 'axis',
            axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        legend: {
            data: ['Pearson相关系数', 'Spearman相关系数', '特征熵'],
            icon: 'circle',
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '5%',
            top: '10%',
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                data: data['variable_names'],
                axisLabel: {
                    rotate: 45,
                    fontSize: 8,
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                axisLabel: {
                    fontSize: 8,
                }
            }
        ],
        series: [
            {
                name: 'Pearson相关系数',
                type: 'bar',
                // stack: '相关系数',
                data: data['corr_pearson'].map(x => x.toFixed(2))
            },
            {
                name: 'Spearman相关系数',
                type: 'bar',
                // stack: '相关系数',
                data: data['corr_spearman'].map(x => x.toFixed(2))
            },
            {
                name: '特征熵',
                type: 'bar',
                // stack: '相关系数',
                data: data['corr_gra'].map(x => x.toFixed(2))
            },
        ]
    };
    myChart.setOption(option, true);
    // 提示信息
    let info = "<p>计算特征与负荷之间相关系数，比较其相关性</br>" + "综合三个系数来看，以下指标与负荷相关性较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data['variable_names'].length; i++) {
        dataInfo.push([data['variable_names'][i], data['corr_pearson'][i]
        + data['corr_spearman'][i] + data['corr_gra'][i]]);
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[1]) < Math.abs(y[1]) ? 1 : -1).slice(0, 6);
    for (let i in maxInfo) {
        info = info + maxInfo[i][0] + '<br/>';
    }
    info = info + '</p>';
    $('#info-corr-feature-load').attr('data-original-title', info).tooltip();
}

function featureOptionSet(data) {
    let select = $("#feature-select");
    select.empty();
    let type;
    let option;
    for (let i = 0; i < feature_names.length; i++) {
        type = feature_names[i];
        option = $("<option></option>").text(type);
        option.attr('value', i);
        select.append(option);
    }
}

function drawFeatureLoadComp(data) {
    let myChart = echarts.init(document.getElementById('comp-feature-load'));
    myChart.hideLoading();
    let option;
    let feature_select = $('#feature-select');
    let type_ = feature_select.val();
    let text_ = feature_select.find('option:selected').text();
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        title: {
            text: text_ + '/平均负荷对比图',
            left: 'center',
            align: 'right',
            textStyle: {
                fontSize: 14,
            }
        },
        grid: {
            bottom: '25%',
            top: '15%',
        },
        toolbox: {
            feature: {}
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                type: 'line'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        legend: {
            data: [text_, '日平均负荷(MW)'],
            left: 'center',
            top: '7%',
            orient: 'horizontal',
        },
        dataZoom: [
            {
                type: 'slider',
                show: true,
                realtime: true,
                start: 0,
                end: 100
            },
            {
                type: 'inside',
                realtime: true,
                start: 0,
                end: 100
            }
        ],
        xAxis: [
            {
                type: 'category',
                boundaryGap: false,
                axisLine: {onZero: false},
                data: data['datetime'],
                textStyle: {
                    fontSize: 10,
                },
                axisLabel: {
                    fontSize: 10,
                },
            }
        ],
        yAxis: [
            {
                name: text_,
                type: 'value',
                nameTextStyle: {
                    fontSize: 10,
                },
                axisLabel: {
                    fontSize: 10,
                },
                max: function (value) {
                    return (value.max * 2);
                },
                min: function (value) {
                    return value.min;
                },
            },
            {
                name: '日平均负荷(MW)',
                type: 'value',
                nameTextStyle: {
                    fontSize: 10,
                },
                axisLabel: {
                    fontSize: 10,
                },
                max: function (value) {
                    return value.max;
                },
                min: function (value) {
                    return (2 * value.min - value.max);
                },
            }
        ],
        series: [
            {
                name: text_,
                type: 'line',
                animation: false,
                // areaStyle: {},
                lineStyle: {
                    width: 1
                },
                data: data['feature'][type_].map(x => x.toFixed(2)),
            },
            {
                name: '日平均负荷(MW)',
                type: 'line',
                yAxisIndex: 1,
                animation: false,
                // areaStyle: {},
                lineStyle: {
                    width: 1
                },
                data: data['load'].map(x => x.toFixed(0)),
            }
        ]
    };
    myChart.setOption(option, true);
    // 绘制散点图
    let myChart2 = echarts.init(document.getElementById('comp-feature-load-scatter'));
    myChart2.hideLoading();
    let data_feature = data['feature'][type_];
    let data_load = data['load'];
    let data_scatter = _.zip(data_feature, data_load);
    let series_ = [{
        name: text_,
        type: 'scatter',
        data: data_scatter,
    }];
    let info = "<p>绘制" + text_ + "与平均负荷关系图，观察两者变化趋势。<br/>同时通过绘制散点图并进行线性拟合可以看到：<br/>";
    let myRegression;
    switch (text_.slice(-2,)) {
        case '温度':
            myRegression = regression(data_scatter);
            switch (myRegression.parameter.length) {
                case 2:
                    if (myRegression.error > 0.1) {
                        info = info + text_ + '与平均负荷无明显相关关系<br/>';
                        break;
                    }
                    let strong_or_weak;
                    strong_or_weak = Math.abs(myRegression.parameter[1]) > 100 ? '较强' : '较弱';
                    let pos_or_neg;
                    pos_or_neg = myRegression.parameter[1] > 0 ? '正相关' : '负相关';
                    info = info + text_ + "与平均负荷呈" + strong_or_weak + pos_or_neg + '<br/>';
                    series_.push({
                        name: '回归值',
                        type: 'line',
                        zlevel: 2,
                        showSymbol: false,
                        data: myRegression.points,
                        lineStyle: {color: '#ff0000'},
                        markPoint: {
                            itemStyle: {
                                normal: {
                                    color: 'transparent'
                                }
                            },
                            label: {
                                show: true,
                                formatter: myRegression.expression,
                                textStyle: {
                                    color: '#ff0000',
                                    fontSize: 12
                                },
                                position: 'left'
                            },
                            data: [{
                                coord: myRegression.points[myRegression.points.length - 1]
                            }]
                        }
                    });
                    break;
                case 3:
                    let pos_or_neg_left;
                    pos_or_neg_left = myRegression.parameter[2] > 0 ? '负相关' : '正相关';
                    let pos_or_neg_right;
                    pos_or_neg_right = myRegression.parameter[2] > 0 ? '正相关' : '负相关';
                    info = info + text_ + "较低时，与平均负荷呈" + pos_or_neg_left + '<br/>'
                        + text_ + "较高时，与平均负荷呈" + pos_or_neg_right + '<br/>';
                    series_.push({
                        name: '回归值',
                        type: 'line',
                        zlevel: 2,
                        showSymbol: false,
                        data: myRegression.points,
                        lineStyle: {color: '#ff0000'},
                        markPoint: {
                            itemStyle: {
                                normal: {
                                    color: 'transparent'
                                }
                            },
                            label: {
                                show: true,
                                formatter: myRegression.expression,
                                textStyle: {
                                    color: '#ff0000',
                                    fontSize: 12
                                },
                                position: 'left',
                            },
                            data: [{
                                coord: myRegression.points[myRegression.points.length - 1]
                            }]
                        }
                    });
                    break;
                default:
            }
            break;
        case '湿度':
            myRegression = regression(data_scatter);
            if (myRegression.error > 0.1) {
                info = info + text_ + '与平均负荷无明显相关关系<br/>';
                break;
            }
            let strong_or_weak;
            strong_or_weak = Math.abs(myRegression.parameter[1]) > 100 ? '较强' : '较弱';
            let pos_or_neg;
            pos_or_neg = myRegression.parameter[1] > 0 ? '正相关' : '负相关';
            info = info + text_ + "与平均负荷呈" + strong_or_weak + pos_or_neg + '<br/>';
            series_.push({
                name: '回归值',
                type: 'line',
                zlevel: 2,
                showSymbol: false,
                data: myRegression.points,
                lineStyle: {color: '#ff0000'},
                markPoint: {
                    itemStyle: {
                        normal: {
                            color: 'transparent'
                        }
                    },
                    label: {
                        show: true,
                        formatter: myRegression.expression,
                        textStyle: {
                            color: '#ff0000',
                            fontSize: 12
                        },
                        position: 'left',
                    },
                    data: [{
                        coord: myRegression.points[myRegression.points.length - 1]
                    }]
                }
            });
            break;
        case '风级':
            info = info + text_ + '与平均负荷无明显相关关系<br/>';
            break;
        default:
    }
    let option2;
    option2 = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        title: {
            text: text_ + '/平均负荷散点图',
            left: 'center',
            align: 'right',
            textStyle: {
                fontSize: 14,
            }
        },
        grid: {
            bottom: '15%',
            top: '15%',
            left: '10%',
            right: '10%',
        },
        toolbox: {
            feature: {}
        },
        tooltip:
            {
                trigger: 'item',
                //设置tooltip格式
                formatter: function (params) {
                    console.log(params.data);
                    let name = params.seriesName;
                    let x = params.data[0];
                    let y = params.data[1];
                    let res = '<p>' + name + ':' + x.toFixed(2) + '</p>';
                    res += '<p>平均负荷' + ':' + y.toFixed(2) + '</p>';
                    return res;
                },
                position: 'left',
            },
        xAxis: {
            type: 'value',
            name: text_,
            nameLocation: 'middle',
            nameGap: 20,
            scale: true,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            },
            splitLine: {
                lineStyle: {
                    type: 'dashed'
                }
            },
            axisTick: { //轴刻度线
                show: false
            },
            axisLine: { //轴
                show: false,
                onZero: false,
            },
        },
        yAxis: {
            type: 'value',
            name: '日平均负荷(MW)',
            scale: true,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            },
            splitLine: {
                lineStyle: {
                    type: 'dashed'
                }
            },
            axisTick: { //轴刻度线
                show: false
            },
            axisLine: { //轴
                show: false,
                onZero: false,
            },
        },
        series: series_,
    };
    myChart2.setOption(option2, true);
    // 提示信息
    info = info + '</p>';
    $('#info-comp-feature-load').attr('data-original-title', info).tooltip();
}

function drawCharaLoadCorr(data, type) {
    let id = 'chara-load-corr-' + type;
    let myChart = echarts.init(document.getElementById(id));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[0].length; j++) {
            data_.push([i, j, Math.floor(data[i][j] * 100) / 100]);
        }
    }
    let option;
    let name;
    switch (type) {
        case 'cause':
            name = '因果关系';
            break;
        default:
            name = type + '相关性';
    }
    option = {
        tooltip: {
            show: true,
            trigger: 'item',
            //设置tooltip格式
            formatter: function (params) {
                let name = params.seriesName;
                let x = params.data[0];
                let y = params.data[1];
                let value = params.data[2];
                let res = '<div><p>' + name + '</p></div>';
                res += '<p>' + feature_names[x] + ',' + chara_names[y] + '</p>';
                res += '<p>' + value + '</p>';
                return res;
            },
            position: ['15%', '5%'],
        },
        animation: false,
        grid: {
            top: '5%',
            bottom: '1%',
            left: '1%',
            right: '5%',
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: feature_names,
            splitArea: {
                show: true
            },
            axisLabel: {
                // interval: 0,
                rotate: 30,
                fontSize: 10,
            }
        },
        yAxis: {
            type: 'category',
            data: chara_names,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 10,
            }
        },
        visualMap: {
            show: false,
            type: 'continuous',
            min: -1,
            max: 1,
            calculable: true,
            // left: 'left',
            // bottom: '15%',
            inRange: {
                color: ['#f1c40f', '#FFFFFF', '#3bb5a0'],
            }
        },
        series: [{
            name: name,
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
                            fontSize: 8,
                        }
                    }
                }
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };
    myChart.setOption(option, true);
    // 提示信息
    let info;
    if (type === 'pearson') {
        info = "<p>计算特征与日负荷特性指标之间的pearson相关性<br/>" + "根据计算结果可知，以下指标之间pearson系数较高：<br/>";
    }
    if (type === 'spearman') {
        info = "<p>计算特征与日负荷特性指标之间的spearman相关性<br/>" + "根据计算结果可知，以下指标之间spearman系数较高：<br/>";
    }
    if (type === 'gra') {
        info = "<p>计算特征与日负荷特性指标之间的灰色相关系数<br/>" + "根据计算结果可知，以下指标之间灰色相关系数较高：<br/>";
    }
    let maxInfo = data_.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 6);
    for (let i in maxInfo) {
        info = info + feature_names[maxInfo[i][0]] + ',' + chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }

    if (type === 'cause') {
        info = "<p>计算特征与日负荷特性指标之间的因果关系<br/>" + "根据计算结果可知，以下指标之间存在明显因果关系(前为因，后为果)：<br/>";
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[0].length; j++) {
                if (data[i][j] !== 0) {
                    info = info + feature_names[i] + ',' + chara_names[j] + '<br/>';
                }
            }
        }
    }
    info = info + '</p>';
    $('#info-chara-load-corr-' + type).attr('data-original-title', info).tooltip();

}

function regression(data) {
    let data_sorted = data.sort((x, y) => {
        return x[0] < y[0] ? -1 : 1;
    });
    let load_sorted = _.unzip(data_sorted)[1];
    let myRegression_1 = ecStat.regression('polynomial', data, 1);
    let load_regression_1 = _.unzip(myRegression_1.points)[1];
    let load_sorted_regression_1 = _.zip(load_sorted, load_regression_1);
    let load_error_1 = load_sorted_regression_1.map(x => {
        return Math.abs(x[0] - x[1]) / x[0];
        // return Math.pow((x[0] - x[1])/x[0], 2);
    });
    myRegression_1['error'] = ecStat.statistics.mean(load_error_1);
    // myRegression['error'] = Math.sqrt(ecStat.statistics.mean(load_error));
    let myRegression_2 = ecStat.regression('polynomial', data, 2);
    let load_regression_2 = _.unzip(myRegression_2.points)[1];
    let load_sorted_regression_2 = _.zip(load_sorted, load_regression_2);
    let load_error_2 = load_sorted_regression_2.map(x => {
        return Math.abs(x[0] - x[1]) / x[0];
    });
    myRegression_2['error'] = ecStat.statistics.mean(load_error_2);
    if ((myRegression_1['error'] - myRegression_2['error']) / myRegression_2['error'] > 0.25) {
        return myRegression_2;
    } else {
        return myRegression_1;
    }
}