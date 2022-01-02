const day_chara = ['日最大负荷', '日最小负荷', '日平均负荷', '日负荷率', '日最小负荷率', '日峰谷差', '日峰谷差率'];
const day_chara_desc = ['每日最大负荷', '每日最小负荷', '每日平均负荷', '日平均负荷/日最大负荷', '日最小负荷/日最大负荷',
    '日最大负荷-日最小负荷', '（日最大负荷-日最小负荷）/日最大负荷'];
const week_chara = ['周最大负荷', '周平均负荷', '周最大日峰谷差', '周平均日负荷率',
    '周最小日负荷率', '周最大日峰谷差率', '周负荷率', '峰谷差最大日负荷'];
const week_chara_desc = ['每周最大负荷', '每周平均负荷', '每周各日峰谷差最大值', '每周各日负荷率平均值',
    '每周各日最小负荷率最小值', '每周各日峰谷差率最大值', '周平均负荷/周最大负荷', '每周内峰谷差最大日对应的最大负荷'];
let day_data;
let week_data;
$(document).ready(function () {
    //表格初始显示
    drawDayCharaTable();
    drawWeekCharaTable();
    //设置电网option
    districtOptionSet();
    // 根据电网设置可选择日期
    $('#district-select').change(function () {
        dateSet();
    });
    // select值发生变化
    $('#type-select').change(function () {
        try {
            drawWeekSubGraph(week_data);
        }catch (e) {
            console.log(e);
        }
        try{
            drawDaySubGraph(day_data);
        }catch (e) {
            console.log(e);
        }
    });
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
            $('.myTables').each(function () {
                $(this).bootstrapTable('showLoading');
            });
            $.ajax({
                url: "/refine_analysis/" + district_id,
                type: 'GET',
                data: {'day_or_week': 'week', 'time': year},
                dateType: "json",
                success: function (result) {
                    week_data = JSON.parse(result);
                    weekOptionSet(week_data['load_average_norm'].length);
                    drawWeekNormAverageLine(week_data['load_average_norm']);
                    drawWeekSubGraph(week_data);
                    // $('#type-select').change(function () {
                    //     drawWeekSubGraph(week_data);
                    // });
                }
            });
            $.ajax({
                url: "/refine_analysis/" + district_id,
                type: 'GET',
                data: {'day_or_week': 'day', 'time': year},
                dateType: "json",
                success: function (result) {
                    day_data = JSON.parse(result);
                    // 根据日负荷数据设置select的option选项
                    dayOptionSet(day_data['load_average_norm'].length);
                    //绘制归一化后日平均负荷曲线
                    drawDayNormAverageLine(day_data['load_average_norm']);
                    // 根据option中内容，使用ajax绘制分项统计图表
                    drawDaySubGraph(day_data);
                    //select值变化
                    // $('#type-select').change(function () {
                    //     drawDaySubGraph(day_data);
                    // });
                }
            });
        }
    });

    // 切换标签
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        // 获取已激活的标签页的名称
        let activeTab = $(e.target)[0].hash;
        if (activeTab === "#tab-day") {
            console.log(activeTab);
            // 根据日负荷数据设置select的option选项
            dayOptionSet(day_data['load_average_norm'].length);
            //绘制归一化后日平均负荷曲线
            drawDayNormAverageLine(day_data['load_average_norm']);
            // 根据option中内容，使用ajax绘制分项统计图表
            drawDaySubGraph(day_data);
        }
        if (activeTab === "#tab-week") {
            console.log(activeTab);
            weekOptionSet(week_data['load_average_norm'].length);
            drawWeekNormAverageLine(week_data['load_average_norm']);
            drawWeekSubGraph(week_data);
        }
    });
})

function districtOptionSet() {
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'load_'},
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
            // 设置初始日期
            let init_time = new Date(result[0].max_time.replace(/-/g, '/'));
            let init_year = init_time.getFullYear();
            $('#datepicker-year').val(init_year);
            if (init) {
                $('#analysis-button').click();
            }
        },
    })
}

// 设置周负荷数据select option选项
function weekOptionSet(len) {
    // let select = $("#week-type-select");
    let select = $('#type-select');
    select.empty();
    let type;
    let option;
    for (let i = 0; i < len; i++) {
        type = '负荷类型' + i;
        option = $("<option></option>").text(type);
        option.attr('value', i);
        select.append(option);
    }
}

// 设置日负荷数据select option选项
function dayOptionSet(len) {
    // let select = $("#type-select");
    let select = $("#type-select");
    select.empty();
    let type;
    let option;
    for (let i = 0; i < len; i++) {
        type = '负荷类型' + i;
        option = $("<option></option>").text(type);
        option.attr('value', i);
        select.append(option);
    }
}

//日聚类，绘制各类型平均折线图
//？图像显示不完全
function drawWeekNormAverageLine(data) {
    let myChart = echarts.init(document.getElementById('week-average-norm-line'));
    myChart.hideLoading();
    let times = [];
    let labels = [];
    let series_ = [];
    let weekday = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 24; j++) {
            times.push(weekday[i]);
        }
    }
    for (let j = 0; j < data.length; j++) {
        labels.push('负荷类型' + j)
    }
    for (let k = 0; k < data.length; k++) {
        series_.push({
            name: labels[k],
            type: 'line',
            data: data[k],
        });
    }
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        title: {
            text: '',
        },
        tooltip: {
            trigger: 'axis',
        },
        legend: {
            data: labels
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '5%',
            containLabel: true
        },
        toolbox: {},
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: times,
            nameTextStyle: {
                fontSize: 10,
                padding: 10,
            },
            axisLabel: {
                interval: 24,
                align: 'center',
                fontSize: 10,
            },
        },
        yAxis: {
            type: 'value',
            name: '负荷(归一化后)',
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            }
        },
        series: series_,
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#week-average-norm-line').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>根据改进自适应K-means聚类结果，周负荷可分为" + week_data['load_average_norm'].length + "类<br/>"
        + "绘制各典型类归一化平均曲线以比较其变化趋势</p>";
    $('#info-week-average-norm-line').attr('data-original-title', info).tooltip();
}

//日聚类，绘制各类型平均折线图
function drawDayNormAverageLine(data) {
    let myChart = echarts.init(document.getElementById('day-average-norm-line'));
    myChart.hideLoading();
    let times = []
    let labels = []
    let series_ = []
    for (let i = 0; i < 24; i++) {
        times.push(i)
    }
    for (let j = 0; j < data.length; j++) {
        labels.push('负荷类型' + j)
        // labels.push('工作日负荷');
        // labels.push('休息日负荷');
    }
    for (let k = 0; k < data.length; k++) {
        series_.push({
            name: labels[k],
            type: 'line',
            data: data[k],
        });
    }
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        title: {
            text: '',
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: labels,
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '5%',
            containLabel: true
        },
        toolbox: {
            // feature: {
            //     saveAsImage: {}
            // }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            // data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            data: times,
            name: '时间(h)',
            nameLocation: 'middle',
            nameGap: 10,
            nameTextStyle: {
                fontSize: 10,
                padding: 10,
            },
            axisLabel: {
                interval: 0,
            },
        },
        yAxis: {
            type: 'value',
            name: '负荷(归一化后)',
            nameTextStyle: {
                fontSize: 10
            },
        },
        series: series_,
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#day-average-norm-line').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>根据改进自适应K-means聚类结果，日负荷可分为" + day_data['load_average_norm'].length + "类<br/>"
        + "绘制各典型类归一化平均曲线以比较其变化趋势</p>";
    $('#info-day-average-norm-line').attr("data-original-title", info).tooltip();
}

//根据option选项绘制分项统计图表
function drawWeekSubGraph(data) {
    //获取type
    let type_ = $("#type-select").val();
    drawWeekLoadLine(data['load_average'][parseInt(type_)], data['load_type'][parseInt(type_)]);
    loadWeekCharaTable(data['chara_average'][parseInt(type_)]);
    drawWeekCorrPearson(data['corr_pearson'][parseInt(type_)]);
    drawWeekCorrSpearman(data['corr_spearman'][parseInt(type_)]);
    drawWeekCorrGra(data['corr_gra'][parseInt(type_)]);
    drawWeekCause(data['cause'][parseInt(type_)]);
}

//根据option选项绘制分项统计图表
function drawDaySubGraph(data) {
    //获取type
    let type_ = $("#type-select").val();
    drawDayLoadLine(data['load_average'][parseInt(type_)], data['load_type'][parseInt(type_)]);
    loadDayCharaTable(data['chara_average'][parseInt(type_)]);
    drawDayCorrPearson(data['corr_pearson'][parseInt(type_)]);
    drawDayCorrSpearman(data['corr_spearman'][parseInt(type_)]);
    drawDayCorrGra(data['corr_gra'][parseInt(type_)]);
    drawDayCause(data['cause'][parseInt(type_)]);
}

function drawDayLoadLine(data, type) {
    let myChart = echarts.init(document.getElementById('day-average-line'));
    myChart.hideLoading();
    let times = [];
    for (let i = 0; i < 24; i++) {
        times.push(i)
    }
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        title: {
            text: '',
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            // data: labels
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '5%',
            containLabel: true
        },
        toolbox: {
            // feature: {
            //     saveAsImage: {}
            // }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            // data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            data: times,
            name: '时间(h)',
            nameLocation: 'middle',
            nameGap: 10,
            nameTextStyle: {
                fontSize: 10,
                padding: 10,
            },
            axisLabel: {
                interval: 0,
            }
        },
        yAxis: {
            type: 'value',
            scale: true, //脱离0刻度
            name: '负荷(MW)',
            nameTextStyle: {
                fontSize: 10,
            },
        },
        series: {
            name: '负荷',
            type: 'line',
            data: data.map(x => x.toFixed(2)),
            markPoint: {
                data: [
                    {type: 'max', name: '最大值'},
                    {type: 'min', name: '最小值'}
                ]
            },
        },
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#day-average-line').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let max_ = Math.max(...data);
    let min_ = Math.min(...data);
    let maxIndex = data.findIndex((item, index) => {
        return item === max_;
    });
    let minIndex = data.findIndex((item, index) => {
        return item === min_;
    });
    if (type > 0.7) {
        type = '工作日负荷，白天负荷比较平稳';
    } else {
        type = '休息日负荷，白天负荷波动较大';
    }
    let info = "<p>将所有聚为第" + $('#type-select').val() + "类的负荷取平均，得到其典型日负荷曲线<br/>"
        + "负荷最大值为" + max_.toFixed(2) + "MW," + "出现于第" + maxIndex + "时<br/>"
        + "负荷最小值为" + min_.toFixed(2) + "MW," + "出现于第" + minIndex + "时<br/>"
        + "根据负荷曲线变化趋势判断，此类型负荷可能为" + type;
    $('#info-day-average-line').attr('data-original-title', info).tooltip();
}

function drawDayCharaTable() {
    let table = $('#table-day-chara');
    let height = $('#day-average-line').height();
    table.bootstrapTable('hideLoading');
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbar: false,
        toolbarAlign: 'right',
        pagination: false,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchAlign: 'right',
        showColumns: false,
        showRefresh: false,
        showToggle: false,
        showPaginationSwitch: false,
        showLoading: false,
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: [
            {
                field: 'chara',  //返回数据rows数组中的每个字典的键名与此处的field值要保持一致
                title: '日特性指标',
            },
            {
                field: 'desc',
                title: '指标描述',
            },
            {
                field: 'value',
                title: '值',
            },
        ],
    });

}

function loadDayCharaTable(data) {
    data_ = []
    for (let i = 0; i < day_chara.length; i++) {
        data_.push({
            'chara': day_chara[i],
            'desc': day_chara_desc[i],
            'value': data[i].toFixed(2),
        })
    }
    let table = $('#table-day-chara');
    table.bootstrapTable('hideLoading');
    table.bootstrapTable('load', data_);
    // 提示信息
    let info = "<p>日负荷特性指标旨在以具体指标描述曲线概况</p>";
    $('#info-table-day-chara').attr('data-original-title', info).tooltip();
}

function drawDayCorrPearson(data) {
    let myChart = echarts.init(document.getElementById('day-corr-pearson'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                // data_.push([i, j, Math.floor(data[i][j] * 100) / 100]);
                data_.push([i, j, data[i][j].toFixed(2)]);
            } else {
                data_.push([i, j, '-']);
            }

        }
    }

    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
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
                res += '<p>' + day_chara[x] + ',' + day_chara[y] + '</p>';
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
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                fontSize: 8,
                rotate: 30,
            }
        },
        visualMap: {
            show: false,
            type: 'continuous',
            min: -1,
            max: 1,
            calculable: true,
            inRange: {
                color: ['#f1c40f', '#FFFFFF', '#3bb5a0'],
            }
        },
        series: [{
            name: 'Pearson相关性',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#day-corr-pearson').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>计算各日负荷特性指标之间的Pearson相关性<br/>" + "根据计算结果可知，以下指标之间Pearson相关性较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                dataInfo.push([i, j, data[i][j].toFixed(2)]);
            }
        }
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    for (let i in maxInfo) {
        info = info + day_chara[maxInfo[i][0]] + ',' + day_chara[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }
    info = info + '</p>';
    $('#info-day-corr-pearson').attr('data-original-title', info).tooltip();
}

function drawDayCorrSpearman(data) {
    let myChart = echarts.init(document.getElementById('day-corr-spearman'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                data_.push([i, j, data[i][j].toFixed(2)]);
            } else {
                data_.push([i, j, '-']);
            }

        }
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
                res += '<p>' + day_chara[x] + ',' + day_chara[y] + '</p>';
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
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: 'Spearman相关性',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#day-corr-spearman').width(),
    };
    myChart.resize(resize);
    // 信息提示
    let info = "<p>计算各日负荷特性指标之间的Spearman相关性<br/>" + "根据计算结果可知，以下指标之间Spearman相关性较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                dataInfo.push([i, j, data[i][j].toFixed(2)]);
            }
        }
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    for (let i in maxInfo) {
        info = info + day_chara[maxInfo[i][0]] + ',' + day_chara[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }
    info = info + '</p>';
    $('#info-day-corr-spearman').attr('data-original-title', info).tooltip();
}

function drawDayCorrGra(data) {
    let myChart = echarts.init(document.getElementById('day-corr-gra'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                data_.push([i, j, data[i][j].toFixed(2)]);
            } else {
                data_.push([i, j, '-']);
            }

        }
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
                res += '<p>' + day_chara[x] + ',' + day_chara[y] + '</p>';
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
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: '灰色关联相关性',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#day-corr-gra').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>计算各日负荷特性指标之间的灰色关联系数<br/>" + "根据计算结果可知，以下指标之间灰色关联系数较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                dataInfo.push([i, j, data[i][j].toFixed(2)]);
            }
        }
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    for (let i in maxInfo) {
        info = info + day_chara[maxInfo[i][0]] + ',' + day_chara[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }
    info = info + '</p>';
    $('#info-day-corr-gra').attr('data-original-title', info).tooltip();
}

function drawDayCause(data) {
    let myChart = echarts.init(document.getElementById('day-cause'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            data_.push([i, j, data[i][j].toFixed(0)]);
        }
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
                res += '<p>' + day_chara[x] + ',' + day_chara[y] + '</p>';
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
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: day_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: '因果关系',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#day-cause').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>使用格兰杰因果关系检验判断各日负荷特性指标之间的因果关系<br/>"
        + "根据计算结果可知，以下指标之间存在因果关系(前者为因，后者为果)：<br/>";
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (data[i][j] !== 0) {
                info = info + day_chara[i] + ',' + day_chara[j] + '<br/>';
            }
        }
    }
    info = info + '</p>';
    $('#info-day-cause').attr('data-original-title', info).tooltip();
}

function drawWeekLoadLine(data, type) {
    let myChart = echarts.init(document.getElementById('week-average-line'));
    myChart.hideLoading();
    let times = [];
    let weekday = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 24; j++) {
            times.push(weekday[i]);
        }
    }
    option = {
        color: ['#f1c40f', '#949494', '#2980b9', '#60c888'],
        title: {
            text: '',
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            // data: labels
        },
        grid: {
            left: '10%',
            right: '5%',
            bottom: '10%',
        },
        toolbox: {},
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: times,
            axisLabel: {
                interval: 24,
                fontSize: 10,
            }
        },
        yAxis: {
            type: 'value',
            scale: true, //脱离0刻度
            name: '负荷(MW)',
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            }
        },
        series: {
            name: '负荷',
            type: 'line',
            data: data.map(x => x.toFixed(2)),
            markPoint: {
                data: [
                    {type: 'max', name: '最大值'},
                    {type: 'min', name: '最小值'}
                ]
            },
        },
    };
    myChart.setOption(option, true);
    let resize = {
        width: $('#week-average_line').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let max_ = Math.max(...data);
    let min_ = Math.min(...data);
    let maxIndex = data.findIndex((item, index) => {
        return item === max_;
    });
    let minIndex = data.findIndex((item, index) => {
        return item === min_;
    });
    if (type > 0.7) {
        type = '无节假日时的一般周负荷';
    } else {
        type = '节假日期间周负荷';
    }
    let info = "<p>将所有聚为第" + $('#type-select').val() + "类的负荷取平均，得到其典型周负荷曲线<br/>"
        + "负荷最大值为" + max_.toFixed(2) + "MW," + "出现于" + times[maxIndex] + "<br/>"
        + "负荷最小值为" + min_.toFixed(2) + "MW," + "出现于" + times[minIndex] + "<br/>"
        + "根据负荷曲线变化趋势判断，此类型负荷可能为" + type + '</p>';
    $('#info-week-average-line').attr('data-original-title', info).tooltip();
}

function drawWeekCharaTable(data) {
    let table = $('#table-week-chara');
    let height = $('#day-average-line').height();
    table.bootstrapTable('hideLoading');
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbarAlign: 'right',
        pagination: false,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchAlign: 'right',
        showColumns: false,
        showRefresh: false,
        showToggle: false,
        showPaginationSwitch: false,
        showLoading: false,
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: [
            {
                field: 'chara',  //返回数据rows数组中的每个字典的键名与此处的field值要保持一致
                title: '周特性指标',
            },
            {
                field: 'desc',
                title: '指标描述',
            },
            {
                field: 'value',
                title: '值',
            },
        ],
    });
}

function loadWeekCharaTable(data) {
    data_ = []
    for (let i = 0; i < week_chara.length; i++) {
        data_.push({
            'chara': week_chara[i],
            'desc': week_chara_desc[i],
            'value': data[i].toFixed(2),
        })
    }
    let table = $('#table-week-chara');
    table.bootstrapTable('hideLoading');
    table.bootstrapTable('load', data_);
    // 提示信息
    let info = "<p>周负荷特性指标旨在以具体指标描述曲线概况</p>";
    $('#info-table-week-chara').attr('data-original-title', info).tooltip();
}

function drawWeekCorrPearson(data) {
    let myChart = echarts.init(document.getElementById('week-corr-pearson'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                data_.push([i, j, data[i][j].toFixed(2)]);
            } else {
                data_.push([i, j, '-']);
            }

        }
    }
    let option;
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
                res += '<p>' + week_chara[x] + ',' + week_chara[y] + '</p>';
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
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: 'Pearson相关性',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#week-corr-pearson').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>计算各周负荷特性指标之间的Pearson相关性<br/>" + "根据计算结果可知，以下指标之间Pearson相关性较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                dataInfo.push([i, j, data[i][j].toFixed(2)]);
            }
        }
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    for (let i in maxInfo) {
        info = info + week_chara[maxInfo[i][0]] + ',' + week_chara[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }
    info = info + '</p>';
    $('#info-week-corr-pearson').attr('data-original-title', info).tooltip();
}

function drawWeekCorrSpearman(data) {
    let myChart = echarts.init(document.getElementById('week-corr-spearman'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                data_.push([i, j, data[i][j].toFixed(2)]);
            } else {
                data_.push([i, j, '-']);
            }

        }
    }
    let option;
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
                res += '<p>' + week_chara[x] + ',' + week_chara[y] + '</p>';
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
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: 'Spearman相关性',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#week-corr-spearman').width(),
    };
    myChart.resize(resize);
    // 信息提示
    let info = "<p>计算各周负荷特性指标之间的Spearman相关性<br/>" + "根据计算结果可知，以下指标之间Spearman相关性较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                dataInfo.push([i, j, data[i][j].toFixed(2)]);
            }
        }
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    for (let i in maxInfo) {
        info = info + week_chara[maxInfo[i][0]] + ',' + week_chara[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }
    info = info + '</p>';
    $('#info-week-corr-spearman').attr('data-original-title', info).tooltip();
}

function drawWeekCorrGra(data) {
    let myChart = echarts.init(document.getElementById('week-corr-gra'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                data_.push([i, j, data[i][j].toFixed(2)]);
            } else {
                data_.push([i, j, '-']);
            }

        }
    }
    let option;
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
                res += '<p>' + week_chara[x] + ',' + week_chara[y] + '</p>';
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
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: '灰色关联相关性',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#week-corr-gra').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>计算各周负荷特性指标之间的灰色关联系数<br/>" + "根据计算结果可知，以下指标之间灰色关联系数较高：<br/>";
    let dataInfo = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (j < i) {
                dataInfo.push([i, j, data[i][j].toFixed(2)]);
            }
        }
    }
    let maxInfo = dataInfo.sort((x, y) => Math.abs(x[2]) < Math.abs(y[2]) ? 1 : -1).slice(0, 5);
    for (let i in maxInfo) {
        info = info + week_chara[maxInfo[i][0]] + ',' + week_chara[maxInfo[i][1]] + ',' + maxInfo[i][2] + '<br/>';
    }
    info = info + '</p>';
    $('#info-week-corr-gra').attr('data-original-title', info).tooltip();
}

function drawWeekCause(data) {
    let myChart = echarts.init(document.getElementById('week-cause'));
    myChart.hideLoading();
    let data_ = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            data_.push([i, j, data[i][j].toFixed(0)]);
        }
    }
    let option;
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
                res += '<p>' + week_chara[x] + ',' + week_chara[y] + '</p>';
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
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 8,
            }
        },
        yAxis: {
            type: 'category',
            data: week_chara,
            splitArea: {
                show: true
            },
            axisLabel: {
                rotate: 30,
                fontSize: 8,
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
            name: '因果关系',
            type: 'heatmap',
            data: data_,
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        textStyle: {
                            color: 'black',
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
        width: $('#week-cause').width(),
    };
    myChart.resize(resize);
    // 提示信息
    let info = "<p>使用格兰杰因果关系检验判断各周负荷特性指标之间的因果关系<br/>"
        + "根据计算结果可知，以下指标之间存在因果关系(前者为因，后者为果)：<br/>";
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (data[i][j] !== 0) {
                info = info + week_chara[i] + ',' + week_chara[j] + '<br/>';
            }
        }
    }
    info = info + '</p>';
    $('#info-week-cause').attr('data-original-title', info).tooltip();
}