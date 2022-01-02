const day_chara_names = ['日最大负荷', '日最小负荷', '日平均负荷', '日负荷率', '日最小负荷率', '日峰谷差', '日峰谷差率'];
const month_chara_names = ['月最大负荷', '月平均负荷', '月最大日峰谷差', '月平均日负荷率', '月最小日负荷率', '月最大日峰谷差率',
    '月负荷率', '峰谷差最大日负荷'];
const day_chara_desc = ['每日最大负荷', '每日最小负荷', '每日平均负荷', '日平均负荷/日最大负荷', '日最小负荷/日最大负荷',
    '日最大负荷-日最小负荷', '（日最大负荷-日最小负荷）/日最大负荷'];
const month_chara_desc = ['每月最大负荷', '每月平均负荷', '每月各日峰谷差最大值', '每月各日负荷率平均值',
    '每月各日最小负荷率最小值', '每月各日峰谷差率最大值', '月平均负荷/月最大负荷', '每月内峰谷差最大日对应的最大负荷'];
const variable_names = ['1小时前负荷', '2小时前负荷', '3小时前负荷', '4小时前负荷', '5小时前负荷', '6小时前负荷', '7小时前负荷'
    , '8小时前负荷', '1天前负荷', '2天前负荷', '3天前负荷', '4天前负荷', '5天前负荷', '6天前负荷', '7天前负荷'];
var all_data;
$(document).ready(function () {
    // 设置画布初始显示
    $('.myEcharts').each(function () {
        $(this).empty();
        let text_ = $("<div class='text-center' style='height: 200px; line-height: 200px'>请选择电网以及年份，进行分析</div>");
        $(this).append(text_);
    })
    //设置电网option
    districtOptionSet();
    // 根据电网设置可选择日期
    $('#district-select').change(function () {
        dateSet();
    })
    // 分析按钮被点击
    $("#analysis-button").click(function () {
        let year = $('#datepicker-year').val();
        let district_id = $('#district-select').val();
        if (year.length === 0) {
            alert('请选择年份');
        } else {
            // 设置画布点击后显示正在加载
            $('.myEcharts').each(function () {
                let id = $(this).attr('id');
                // $(this).empty();
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
                url: "/inner_analysis/" + district_id,
                type: 'GET',
                data: {'time': year},
                dateType: "json",
                success: function (result) {
                    all_data = JSON.parse(result);
                    // 绘制负荷图
                    // drawLoadLine(all_data['load_line']);
                    // 绘制负荷分布图
                    drawDistLine(all_data['dist_line'], type = '1');
                    // 绘制负荷内部相关关系图
                    drawInnerCorr(all_data['inner_corr'], type = '1');
                    // 日负荷特性指标
                    dayCharaOptionSet();
                    drawDayChara(all_data['day_chara']);
                    $('#day-chara-select').change(function () {
                        drawDayChara(all_data['day_chara']);
                    })
                    // 月负荷特性指标
                    // 绘制负荷分布图
                    drawDistLine(all_data['dist_line'], type = '2');
                    // 绘制负荷内部相关关系图
                    drawInnerCorr(all_data['inner_corr'], type = '2');
                    MonthCharaOptionSet();
                    drawMonthChara(all_data['month_chara']);
                    $('#month-chara-select').change(function () {
                        drawMonthChara(all_data['month_chara']);
                    })
                    // 日负荷特性相关性与因果
                    drawDayCorr(all_data['day_chara_corr'], 'pearson');
                    drawDayCorr(all_data['day_chara_corr'], 'spearman');
                    drawDayCorr(all_data['day_chara_corr'], 'gra');
                    drawDayCorr(all_data['day_chara_corr'], 'cause');
                    // 月负荷特性相关性与因果
                    drawMonthCorr(all_data['month_chara_corr'], 'pearson');
                    drawMonthCorr(all_data['month_chara_corr'], 'spearman');
                    drawMonthCorr(all_data['month_chara_corr'], 'gra');
                    drawMonthCorr(all_data['month_chara_corr'], 'cause');
                }
            });
        }
    });
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        // 获取已激活的标签页的名称
        let activeTab = $(e.target)[0].hash;
        if (activeTab === "#tab-day") {
            console.log(activeTab);
            drawDistLine(all_data['dist_line'], type = '1');
            // 绘制负荷内部相关关系图
            drawInnerCorr(all_data['inner_corr'], type = '1');
            // 日负荷特性指标
            drawDayChara(all_data['day_chara']);
            drawDayCorr(all_data['day_chara_corr'], 'pearson');
            drawDayCorr(all_data['day_chara_corr'], 'spearman');
            drawDayCorr(all_data['day_chara_corr'], 'gra');
            drawDayCorr(all_data['day_chara_corr'], 'cause');
        }
        if (activeTab === "#tab-month") {
            console.log(activeTab);
            drawDistLine(all_data['dist_line'], type = '2');
            drawInnerCorr(all_data['inner_corr'], type = '2');
            drawMonthChara(all_data['month_chara']);
            drawMonthCorr(all_data['month_chara_corr'], 'pearson');
            drawMonthCorr(all_data['month_chara_corr'], 'spearman');
            drawMonthCorr(all_data['month_chara_corr'], 'gra');
            drawMonthCorr(all_data['month_chara_corr'], 'cause');
        }
    });
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
        data: {'search_kw': 'load_', 'district_id': district_id},
        dataType: "json",
        success: function (result) {
            $('.J-yearPicker-single').datePicker({
                format: 'YYYY',
                language: 'zh',
                min: result[0].min_time,
                max: result[0].max_time,
            });
            $('#datepicker-year').val(result[0].max_time.slice(0, 4));
            if (init) {
                $('#analysis-button').click();
            }
        }
    })
}

function drawLoadLine(data) {
    // let myChart = echarts.init(document.getElementById('load-line'));
    // myChart.hideLoading();
    // let option;
    // option = {
    //     color: ['#007d7b', '#f1c40f', '#949494', '#2980b9', '#60c888'],
    //     title: {
    //         text: '负荷曲线',
    //         left: 'center',
    //     },
    //     tooltip: {
    //         trigger: 'axis'
    //     },
    //     legend: {
    //         data: ['负荷值'],
    //         left: '5%',
    //     },
    //     grid: {
    //         bottom: '10%',
    //         containLabel: true
    //     },
    //     toolbox: {
    //         feature: {}
    //     },
    //     dataZoom: [
    //         {
    //             show: true,
    //             realtime: true,
    //             start: 65,
    //             end: 85
    //         },
    //         {
    //             type: 'inside',
    //             realtime: true,
    //             start: 65,
    //             end: 85
    //         },
    //     ],
    //     xAxis: {
    //         type: 'category',
    //         boundaryGap: false,
    //         data: data['datetime'],
    //         axisLabel: {
    //             // interval: 0,
    //         },
    //     },
    //     yAxis: {
    //         type: 'value',
    //         name: '负荷(MW)',
    //         nameLocation: 'middle',
    //         nameGap: 30,
    //         nameTextStyle: {
    //             fontSize: 16,
    //             padding: 10,
    //         }
    //     },
    //     series: [
    //         {
    //             type: 'line',
    //             data: data['load'].map(value => value.toFixed(2)),
    //             // areaStyle: {},
    //             name: '负荷值',
    //             animation: false,
    //         },
    //     ],
    // };
    // myChart.setOption(option, true);
    let myChart = echarts.init(document.getElementById('load-distribution-1'));
    var bins = ecStat.histogram(all_data['dist_line']['load_value'], 'freedmanDiaconis');
    var option = {
        title: {
            text: 'Girths of Black Cherry Trees',
            left: 'center',
            top: 20
        },
        color: ['rgb(25, 183, 207)'],
        grid: {
            left: '3%',
            right: '3%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: [{
            type: 'value',
            scale: true, //这个一定要设，不然barWidth和bins对应不上
        }],
        yAxis: [{
            type: 'value',
        }],
        series: [{
            name: 'height',
            type: 'bar',
            barWidth: '99.3%',
            label: {
                normal: {
                    show: true,
                    position: 'insideTop',
                    formatter: function (params) {
                        return params.value[1];
                    }
                }
            },
            data: bins.data
        }]
    };
    myChart.setOption(option, true);
}

function drawDistLine(data, type) {
    let id = 'load-distribution-' + type;
    let myChart = echarts.init(document.getElementById(id));
    myChart.hideLoading();
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9',],
        title: {
            text: '负荷分布曲线',
            left: 'center',
            textStyle: {
                fontSize: 14,
            }
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            show: false,
            data: ['概率'],
            left: '5%',
        },
        grid: {
            bottom: '10%',
            top: '15%',
            left: '3%',
            right: '3%',
            containLabel: true
        },
        toolbox: {
            feature: {}
        },
        // dataZoom: [
        //     {
        //         show: true,
        //         realtime: true,
        //         start: 65,
        //         end: 85
        //     },
        //     {
        //         type: 'inside',
        //         realtime: true,
        //         start: 65,
        //         end: 85
        //     },
        // ],
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data['load_value'].map(value => value.toFixed(2)),
            name: '负荷(MW)',
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                // interval: 0,
                fontSize: 10,
            },
        },
        yAxis: {
            type: 'value',
            name: '概率',
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            },
        },
        series: [
            {
                type: 'line',
                data: data['times'].map(x => (x / ecStat.statistics.sum(data['times'])).toFixed(5)),
                areaStyle: {},
                name: '概率',
                animation: false,
                markPoint: {
                    data: [
                        {type: 'max', name: '最大值'},
                    ]
                },
            },
        ],
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#' + id).width(),
    };
    myChart.resize(resize);
    // 提示信息
    let max_load = ecStat.statistics.max(data['load_value']);
    let min_load = ecStat.statistics.min(data['load_value']);
    let mean_load = ecStat.statistics.mean(data['load_value']).toFixed(2);
    let index_ = data['times'].indexOf(ecStat.statistics.max(data['times']));
    let max_times = data['load_value'][index_];

    let info = '<p>' + "最大负荷为: " + max_load + "MW<br/>"
        + "最小负荷为: " + min_load + "MW<br/>"
        + "平均负荷为: " + mean_load + "MW<br/>"
        + "负荷在 " + max_times.toFixed(2) + "MW 附近出现概率最高"
        + "</p>";
    $('#info-' + id).attr('data-original-title', info).tooltip();
}

function drawInnerCorr(data, type) {
    let id = 'inner-corr-' + type;
    let myChart = echarts.init(document.getElementById(id));
    myChart.hideLoading();
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9',],
        tooltip: {
            trigger: 'axis',
            axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        legend: {
            data: ['Pearson相关系数', 'Spearman相关系数', '灰色关联相关系数'],
            icon: 'circle',
            textStyle: {
                fontSize: 10,
            }
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
                data: variable_names,
                axisLabel: {
                    // interval: 0,
                    fontSize: 10,
                    rotate: 45,
                },
                nameTextStyle: {
                    fontSize: 10,
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                axisLabel: {
                    fontSize: 10,
                }
            }
        ],
        series: [
            {
                name: 'Pearson相关系数',
                type: 'bar',
                // stack: '相关系数',
                data: data['inner_corr_pearson'].map(x => x.toFixed(2))
            },
            {
                name: 'Spearman相关系数',
                type: 'bar',
                // stack: '相关系数',
                data: data['inner_corr_spearman'].map(x => x.toFixed(2))
            },
            {
                name: '灰色关联相关系数',
                type: 'bar',
                // stack: '相关系数',
                data: data['inner_corr_gra'].map(x => x.toFixed(2))
            },
        ]
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#' + id).width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>" + "比较分析1-8小时前负荷，1-7天前负荷与此时刻负荷相关性，可以发现: <br/>"
        + "在一天内，负荷相关性与时间间隔成反比，时间越靠近，则相关性越高。<br/>"
        + "而短期几天前同一时刻的负荷与此时刻负荷相关性均较强。<br/></p>";
    $('#info-' + id).attr('data-original-title', info).tooltip();
}

function dayCharaOptionSet() {
    let select = $("#day-chara-select");
    select.empty();
    let type;
    let option;
    for (let i = 0; i < day_chara_names.length; i++) {
        type = day_chara_names[i];
        option = $("<option></option>").text(type);
        option.attr('value', i);
        select.append(option);
    }
}

function MonthCharaOptionSet() {
    let select = $("#month-chara-select");
    select.empty();
    let type;
    let option;
    for (let i = 0; i < month_chara_names.length; i++) {
        type = month_chara_names[i];
        option = $("<option></option>").text(type);
        option.attr('value', i);
        select.append(option);
    }
}

function drawDayChara(data) {
    let myChart = echarts.init(document.getElementById('day-chara'));
    myChart.hideLoading();
    let text_ = $('#day-chara-select option:selected').text()
    let value_ = $('#day-chara-select').val()
    // 除去异常数据
    let data_zip = _.zip(data['datetime'], data['values'][value_])
    let data_filter = data_zip.filter(x => (x[1] !== 0 && x[1] !== 1));
    let data_ = _.unzip(data_filter);
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9',],
        title: {
            text: text_,
            left: 'center',
            textStyle: {
                fontSize: 14,
            }
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            show: false,
            data: [text_],
            left: '5%',
        },
        grid: {
            bottom: '5%',
            left: '5%',
            right: '5%',
            top: '10%',
            containLabel: true
        },
        toolbox: {
            feature: {}
        },
        // dataZoom: [
        //     {
        //         show: true,
        //         realtime: true,
        //         start: 65,
        //         end: 85
        //     },
        //     {
        //         type: 'inside',
        //         realtime: true,
        //         start: 65,
        //         end: 85
        //     },
        // ],
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data_[0],
            // name: '时间/h',
            // nameLocation: 'middle',
            // nameGap: 20,
            // nameTextStyle: {
            //     fontSize: 16,
            //     padding: 10,
            // },
            axisLabel: {
                // interval: 0,
                fontSize: 10,
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                fontSize: 10,
            }
        },
        series: [
            {
                type: 'line',
                data: data_[1].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: text_,
                animation: false,
                markPoint: {
                    data: [
                        {type: 'max', name: '最大值'},
                        {type: 'min', name: '最小值'},
                    ]
                }
            },
        ],
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#day-chara').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let dev = ecStat.statistics.deviation(data_[1]) / ecStat.statistics.mean(data_[1]);
    let data_summer = data_zip.filter(x => (x[0].slice(5,) > '07-01' && x[0].slice(5,) < '10-01'));
    let data_winter = data_zip.filter(x => (x[0].slice(5,) > '01-01' && x[0].slice(5,) < '04-01'));
    let summer_mean = ecStat.statistics.mean(_.unzip(data_summer)[1]);
    let winter_mean = ecStat.statistics.mean(_.unzip(data_winter)[1]);
    let analysis_text;
    if (dev < 0.08) {
        analysis_text = "全年" + text_ + "变化比较平稳，无明显波动<br/>";
    } else {
        analysis_text = "全年" + text_ + "波动较大<br/>";
        if (summer_mean > winter_mean) {
            analysis_text = analysis_text + "夏季" + text_ + "较冬季更高";
        } else {
            analysis_text = analysis_text + "夏季" + text_ + "较冬季更低";
        }
    }
    let info = '<p>' + '各日负荷特性指标定义如下:<br/>';
    for (let i in day_chara_names){
        info = info + day_chara_names[i] + ': ' + day_chara_desc[i] + '<br/>';
    }
    info = info + '<br/>' + text_ + "最大值为: " + _.max(data_[1]).toFixed(2) + "<br/>"
        + text_ + "最小值为: " + _.min(data_[1]).toFixed(2) + "<br/>"
        + analysis_text
        + "</p>";
    $('#info-day-chara').attr('data-original-title', info).tooltip();
}

function drawMonthChara(data) {
    let myChart = echarts.init(document.getElementById('month-chara'));
    myChart.hideLoading();
    let text_ = $('#month-chara-select option:selected').text()
    let value_ = $('#month-chara-select').val()
    let data_ = data['values'][value_]
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9',],
        title: {
            text: text_,
            left: 'center',
            textStyle: {
                fontSize: 14,
            }
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            show: false,
            data: [text_],
            left: '5%',
        },
        grid: {
            top: '10%',
            right: '5%',
            bottom: '5%',
            left: '5%',
            containLabel: true
        },
        toolbox: {
            feature: {}
        },
        // dataZoom: [
        //     {
        //         show: true,
        //         realtime: true,
        //         start: 65,
        //         end: 85
        //     },
        //     {
        //         type: 'inside',
        //         realtime: true,
        //         start: 65,
        //         end: 85
        //     },
        // ],
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data['datetime'],
            // name: '时间/h',
            // nameLocation: 'middle',
            // nameGap: 20,
            // nameTextStyle: {
            //     fontSize: 16,
            //     padding: 10,
            // },
            axisLabel: {
                fontSize: 10,
                // interval: 0,
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                fontSize: 10,
            }
        },
        series: [
            {
                type: 'line',
                data: data_.map(value => value.toFixed(2)),
                // areaStyle: {},
                name: text_,
                animation: false,
                markPoint: {
                    data: [
                        {type: 'max', name: '最大值'},
                        {type: 'min', name: '最小值'},
                    ]
                }
            },
        ],
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#month-chara').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let dev = ecStat.statistics.deviation(data_) / ecStat.statistics.mean(data_);
    let data_zip = _.zip(data['datetime'], data_);
    let analysis_text;
    if (dev < 0.1) {
        analysis_text = "全年" + text_ + "变化比较平稳，无明显波动<br/>";
    } else {
        analysis_text = "全年" + text_ + "波动较大<br/>";
        data_zip.sort((x, y) => (x[1] < y[1] ? -1 : 1));
        analysis_text = analysis_text
            + data_zip[0][0].slice(5,) + "月与"
            + data_zip[1][0].slice(5,) + "月" + text_ + "较低<br/>";
        data_zip.sort((x, y) => (x[1] < y[1] ? 1 : -1));
        analysis_text = analysis_text
            + data_zip[0][0].slice(5,) + "月与"
            + data_zip[1][0].slice(5,) + "月" + text_ + "较高<br/>";
    }
    let info = '<p>' + '月负荷特性指标定义如下：<br/>';
    for (let i in month_chara_names){
        info = info + month_chara_names[i] + ': ' + month_chara_desc[i] + '<br/>';
    }

    info = info + '<br/>' + text_ + "最大值为: " + _.max(data_).toFixed(2) + "<br/>"
        + text_ + "最小值为: " + _.min(data_).toFixed(2) + "<br/>"
        + analysis_text
        + "</p>";
    $('#info-month-chara').attr('data-original-title', info).tooltip();
}

function drawDayCorr(data, type) {
    let id = 'day-chara-corr-' + type;
    let myChart = echarts.init(document.getElementById(id));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data[type].length; i++) {
        for (let j = 0; j < data[type][0].length; j++) {
            if (j >= i && type !== 'cause') {
                data_.push([i, j, '-']);
            } else {
                if (type === 'cause') {
                    data_.push([i, j, data[type][i][j].toFixed(0)]);
                } else {
                    data_.push([i, j, data[type][i][j].toFixed(2)]);
                }
            }

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
                res += '<p>' + day_chara_names[x] + ',' + day_chara_names[y] + '</p>';
                res += '<p>' + value + '</p>';
                return res;
            },
            position: ['15%', '5%']
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
            data: day_chara_names,
            splitArea: {
                show: true
            },
            axisLabel: {
                // interval: 0,
                fontSize: 10,
                rotate: 30,
            }
        },
        yAxis: {
            type: 'category',
            data: day_chara_names,
            splitArea: {
                show: true
            },
            axisLabel: {
                fontSize: 10,
                rotate: 30,
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
    let resize = {
        width: $('#' + id).width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info;
    let dataInfo = data_.filter(x => x[2] !== '-');
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    if (type === 'pearson') {
        info = "<p>计算日特性指标之间Pearson相关性<br/>" + "根据计算结果可知，以下指标之间的Pearson系数较高: <br/>";
        for (let i in maxInfo) {
            info = info + day_chara_names[maxInfo[i][0]] + ','
                + day_chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
        }
    }
    if (type === 'spearman') {
        info = "<p>计算日特性指标之间Spearman相关性<br/>" + "根据计算结果可知，以下指标之间的Spearman系数较高: <br/>";
        for (let i in maxInfo) {
            info = info + day_chara_names[maxInfo[i][0]] + ','
                + day_chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
        }
    }
    if (type === 'gra') {
        info = "<p>计算日特性指标之间灰色关联系数<br/>" + "根据计算结果可知，以下指标之间的灰色关联系数较高: <br/>";
        for (let i in maxInfo) {
            info = info + day_chara_names[maxInfo[i][0]] + ','
                + day_chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
        }
    }
    if (type === 'cause') {
        info = "<p>计算日负荷特性指标之间的因果关系<br/>" + "根据计算结果可知，以下指标之间存在明显因果关系(前为因，后为果)：<br/>";
        for (let i = 0; i < data[type].length; i++) {
            for (let j = 0; j < data[type][0].length; j++) {
                if (data[type][i][j] !== 0) {
                    info = info + day_chara_names[i] + ',' + day_chara_names[j] + '<br/>';
                }
            }
        }
    }
    info = info + '</p>';
    $('#info-day-chara-corr-' + type).attr('data-original-title', info).tooltip();
}

function drawMonthCorr(data, type) {
    let id = 'month-chara-corr-' + type;
    let myChart = echarts.init(document.getElementById(id));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data[type].length; i++) {
        for (let j = 0; j < data[type][0].length; j++) {
            if (j >= i && type !== 'cause') {
                data_.push([i, j, '-']);
            } else {
                if (type === 'cause') {
                    data_.push([i, j, data[type][i][j].toFixed(0)]);
                } else {
                    data_.push([i, j, data[type][i][j].toFixed(2)]);
                }
            }
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
                res += '<p>' + month_chara_names[x] + ',' + month_chara_names[y] + '</p>';
                res += '<p>' + value + '</p>';
                return res;
            },
            position: ['15%', '5%']
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
            data: month_chara_names,
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
            data: month_chara_names,
            splitArea: {
                show: true
            },
            axisLabel: {
                fontSize: 10,
                rotate: 30,
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
    let resize = {
        width: $('#' + id).width(),
    };
    myChart.resize(resize);
    let info;
    let dataInfo = data_.filter(x => x[2] !== '-');
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    if (type === 'pearson') {
        info = "<p>计算月特性指标之间Pearson相关性<br/>" + "根据计算结果可知，以下指标之间的Pearson系数较高: <br/>";
        for (let i in maxInfo) {
            info = info + month_chara_names[maxInfo[i][0]] + ','
                + month_chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
        }
    }
    if (type === 'spearman') {
        info = "<p>计算月特性指标之间Spearman相关性<br/>" + "根据计算结果可知，以下指标之间的Spearman系数较高: <br/>";
        for (let i in maxInfo) {
            info = info + month_chara_names[maxInfo[i][0]] + ','
                + month_chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
        }
    }
    if (type === 'gra') {
        info = "<p>计算月特性指标之间灰色关联系数<br/>" + "根据计算结果可知，以下指标之间的灰色关联系数较高: <br/>";
        for (let i in maxInfo) {
            info = info + month_chara_names[maxInfo[i][0]] + ','
                + month_chara_names[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
        }
    }
    if (type === 'cause') {
        info = "<p>计算月负荷特性指标之间的因果关系<br/>" + "根据计算结果可知，以下指标之间存在明显因果关系(前为因，后为果)：<br/>";
        for (let i = 0; i < data[type].length; i++) {
            for (let j = 0; j < data[type][0].length; j++) {
                if (data[type][i][j] !== 0) {
                    info = info + month_chara_names[i] + ',' + month_chara_names[j] + '<br/>';
                }
            }
        }
    }
    info = info + '</p>';
    $('#info-month-chara-corr-' + type).attr('data-original-title', info).tooltip();
}