import React, { useState, useEffect } from "react";
import { useMetrics } from "@/context/MetricsContext";
import { useNotification } from "@/context/NotificationContext";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { MaintenanceSatisfactionData } from "@/context/MetricsContext";

interface MetricData {
  displayValue: string;
  title: string;
  value: string;
  target: string;
  icon: React.ReactNode;
  change: number;
  isPositive: boolean;
  reachedTarget: boolean;
  isLowerBetter: boolean;
}

interface CustomerServiceData {
  calls: {
    complaints: number;
    contactRequests: number;
    maintenanceRequests: number;
    inquiries: number;
    officeInterested: number;
    projectsInterested: number;
    customersInterested: number;
    total: number;
  };
  inquiries: {
    general: number;
    documentRequests: number;
    deedInquiries: number;
    apartmentRentals: number;
    soldProjects: number;
  };
  maintenance: {
    cancelled: number;
    resolved: number;
    inProgress: number;
  };
}

interface SatisfactionCategory {
  veryHappy: number;
  happy: number;
  neutral: number;
  unhappy: number;
  veryUnhappy: number;
}

type SatisfactionKey = 'serviceQuality' | 'closureTime' | 'firstTimeResolution';

interface FormDataState {
  metrics: Array<MetricData & { displayValue: string }>;
  customerService: CustomerServiceData;
  maintenanceSatisfaction: MaintenanceSatisfactionData;
}

interface FormData {
  metrics: Array<{
    displayValue: string;
    title: string;
    value: string;
    target: string;
    icon: React.ReactNode;
    change: number;
    isPositive: boolean;
    reachedTarget: boolean;
    isLowerBetter: boolean;
  }>;
  customerService: {
    calls: {
      complaints: number;
      contactRequests: number;
      maintenanceRequests: number;
      inquiries: number;
      officeInterested: number;
      projectsInterested: number;
      customersInterested: number;
      total: number;
    };
    inquiries: {
      general: number;
      documentRequests: number;
      deedInquiries: number;
      apartmentRentals: number;
      soldProjects: number;
    };
    maintenance: {
      cancelled: number;
      resolved: number;
      inProgress: number;
    };
  };
  maintenanceSatisfaction: MaintenanceSatisfactionData;
}

export default function DataEntry() {
  const { user } = useAuth();
  const {
    metrics,
    updateMetric,
    customerServiceData,
    updateCustomerServiceData,
    maintenanceSatisfaction,
    updateMaintenanceSatisfactionData,
    currentPeriod,
    setCurrentPeriod
  } = useMetrics();

  const { addNotification } = useNotification();
  const [newComment, setNewComment] = useState("");
  const [formData, setFormData] = useState<FormDataState>({
    metrics: metrics.map(metric => ({
      ...metric,
      displayValue: metric.value ? metric.value.replace(/[^0-9.-]/g, '') : '0'
    })),
    customerService: customerServiceData,
    maintenanceSatisfaction: maintenanceSatisfaction
  });

  // تحديث البيانات المحلية عند تغيير الفترة
  useEffect(() => {
    setFormData({
      metrics: metrics.map(metric => ({
        ...metric,
        displayValue: metric.value ? metric.value.replace(/[^0-9.-]/g, '') : '0'
      })),
      customerService: customerServiceData,
      maintenanceSatisfaction: maintenanceSatisfaction
    });
  }, [metrics, customerServiceData, maintenanceSatisfaction, currentPeriod]);

  const handleMetricChange = async (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    const numValue = parseFloat(cleanValue);
    
    if (isNaN(numValue) && value !== '' && value !== '-') return;

    const metric = metrics[index];
    const targetValue = parseFloat(metric.target.replace(/[^0-9.-]/g, '') || '0');
    
    const updatedMetric = {
      ...metric,
      value: cleanValue + '%',
      change: targetValue !== 0 ? ((numValue - targetValue) / targetValue) * 100 : 0,
      isPositive: !metric.isLowerBetter ? numValue >= targetValue : numValue <= targetValue,
      reachedTarget: !metric.isLowerBetter ? numValue >= targetValue : numValue <= targetValue,
      _period: currentPeriod
    };

    try {
      // تحديث الحالة المحلية أولاً
      setFormData(prev => {
        const newMetrics = [...prev.metrics];
        newMetrics[index] = {
          ...newMetrics[index],
          ...updatedMetric,
          displayValue: cleanValue
        };
        return { ...prev, metrics: newMetrics };
      });

      // ثم تحديث السياق
      await updateMetric(index, updatedMetric);

      addNotification({
        title: "تم الحفظ",
        message: "تم تحديث المؤشر بنجاح",
        type: "success"
      });
    } catch (error) {
      console.error("خطأ في تحديث المؤشر:", error);
      addNotification({
        title: "خطأ",
        message: "حدث خطأ أثناء تحديث المؤشر",
        type: "error"
      });
    }
  };

  const handleServiceChange = async (section: string, field: string, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    const numValue = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
    
    try {
      const updatedCustomerService = { ...formData.customerService };

      if (section === 'calls') {
        updatedCustomerService.calls = {
          ...updatedCustomerService.calls,
          [field]: numValue
        };
        
        const total = Object.entries(updatedCustomerService.calls)
          .filter(([key]) => key !== 'total')
          .reduce((sum, [_, val]) => sum + (typeof val === 'number' ? val : 0), 0);
        
        updatedCustomerService.calls.total = total;
      } 
      else if (section === 'inquiries') {
        updatedCustomerService.inquiries = {
          ...updatedCustomerService.inquiries,
          [field]: numValue
        };
      }
      else if (section === 'maintenance') {
        updatedCustomerService.maintenance = {
          ...updatedCustomerService.maintenance,
          [field]: numValue
        };
      }

      // تحديث الحالة المحلية أولاً
      setFormData(prev => ({
        ...prev,
        customerService: updatedCustomerService
      }));

      // ثم تحديث السياق
      await updateCustomerServiceData({
        ...updatedCustomerService,
        _period: currentPeriod
      });

      addNotification({
        title: "تم الحفظ",
        message: "تم تحديث البيانات بنجاح",
        type: "success"
      });
    } catch (error) {
      console.error("خطأ في تحديث البيانات:", error);
      addNotification({
        title: "خطأ",
        message: "حدث خطأ أثناء تحديث البيانات",
        type: "error"
      });
    }
  };

  const handleSatisfactionChange = async (category: SatisfactionKey, field: keyof SatisfactionCategory, value: string) => {
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    const numValue = parseFloat(cleanValue);
    
    if (isNaN(numValue) && value !== '' && value !== '-') return;

    const currentCategory = formData.maintenanceSatisfaction[category] as SatisfactionCategory;
    
    const updatedSatisfaction = {
      ...formData.maintenanceSatisfaction,
      [category]: {
        ...currentCategory,
        [field]: value === '' ? 0 : numValue
      }
    };

    try {
      // تحديث الحالة المحلية أولاً
      setFormData(prev => ({
        ...prev,
        maintenanceSatisfaction: updatedSatisfaction
      }));

      // ثم تحديث السياق
      await updateMaintenanceSatisfactionData({
        ...updatedSatisfaction,
        _period: currentPeriod
      });

      addNotification({
        title: "تم الحفظ",
        message: "تم تحديث بيانات الرضا بنجاح",
        type: "success"
      });
    } catch (error) {
      console.error("خطأ في تحديث بيانات الرضا:", error);
      addNotification({
        title: "خطأ",
        message: "حدث خطأ أثناء تحديث بيانات الرضا",
        type: "error"
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    const currentDate = new Date();
    const newCommentObj = {
      text: newComment.trim(),
      date: currentDate.toLocaleDateString(),
      time: currentDate.toLocaleTimeString(),
      username: user?.username || 'مجهول'
    };

    const updatedSatisfaction = {
      ...formData.maintenanceSatisfaction,
      comments: [...formData.maintenanceSatisfaction.comments, newCommentObj]
    };

    setFormData(prev => ({
      ...prev,
      maintenanceSatisfaction: updatedSatisfaction
    }));

    try {
      await updateMaintenanceSatisfactionData({
        ...updatedSatisfaction,
        _period: currentPeriod
      });

      setNewComment("");
      
      addNotification({
        title: "تم الإضافة",
        message: "تم إضافة التعليق بنجاح",
        type: "success"
      });
    } catch (error) {
      console.error("خطأ في إضافة التعليق:", error);
      addNotification({
        title: "خطأ",
        message: "حدث خطأ أثناء إضافة التعليق",
        type: "error"
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">إدخال البيانات</h1>
            <div className="flex gap-2">
              <Button
                variant={currentPeriod === "weekly" ? "default" : "outline"}
                onClick={() => setCurrentPeriod("weekly")}
              >
                أسبوعي
              </Button>
              <Button
                variant={currentPeriod === "yearly" ? "default" : "outline"}
                onClick={() => setCurrentPeriod("yearly")}
              >
                سنوي
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">مؤشرات الأداء</TabsTrigger>
            <TabsTrigger value="service">خدمة العملاء</TabsTrigger>
            <TabsTrigger value="satisfaction">رضا العملاء</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>مؤشرات الأداء الرئيسية - {currentPeriod === "weekly" ? "أسبوعي" : "سنوي"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.metrics.map((metric, index) => (
                      <div key={index} className="space-y-2 p-4 border rounded-lg">
                        <Label>{metric.title}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={metric.displayValue}
                          onChange={(e) => handleMetricChange(index, e.target.value)}
                          className="text-left ltr"
                          dir="ltr"
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>الهدف: {metric.target}</span>
                          <span>التغيير: {metric.change.toFixed(1)}%</span>
                        </div>
                        <div className={`text-sm ${metric.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {metric.isPositive ? 'تم تحقيق الهدف' : 'لم يتم تحقيق الهدف'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="service">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>المكالمات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(formData.customerService.calls)
                      .filter(([key]) => key !== 'total')
                      .map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label>{getServiceLabel(key)}</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => handleServiceChange('calls', key, e.target.value)}
                            className="text-left ltr"
                            dir="ltr"
                          />
                        </div>
                      ))}
                    <div className="pt-4 border-t mt-4">
                      <div className="flex justify-between items-center">
                        <Label>المجموع</Label>
                        <span className="text-xl font-bold">
                          {formData.customerService.calls.total}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الاستفسارات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(formData.customerService.inquiries).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label>{getServiceLabel(key)}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => handleServiceChange('inquiries', key, e.target.value)}
                          className="text-left ltr"
                          dir="ltr"
                        />
                      </div>
                    ))}
                    <div className="pt-4 border-t mt-4">
                      <div className="flex justify-between items-center">
                        <Label>المجموع</Label>
                        <span className="text-xl font-bold">
                          {Object.values(formData.customerService.inquiries).reduce((a, b) => a + b, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>طلبات الصيانة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(formData.customerService.maintenance).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label>{getServiceLabel(key)}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => handleServiceChange('maintenance', key, e.target.value)}
                          className="text-left ltr"
                          dir="ltr"
                        />
                      </div>
                    ))}
                    <div className="pt-4 border-t mt-4">
                      <div className="flex justify-between items-center">
                        <Label>المجموع</Label>
                        <span className="text-xl font-bold">
                          {Object.values(formData.customerService.maintenance).reduce((a, b) => a + b, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="satisfaction">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['serviceQuality', 'closureTime', 'firstTimeResolution'].map((category) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{getSatisfactionTitle(category)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(formData.maintenanceSatisfaction[category as SatisfactionKey] as SatisfactionCategory).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label>{getSatisfactionLabel(key)}</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => handleSatisfactionChange(category as SatisfactionKey, key as keyof SatisfactionCategory, e.target.value)}
                            className="text-left ltr"
                            dir="ltr"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-4 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-white">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="أضف تعليقاتك هنا"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-gray-800 text-white border-gray-700 placeholder:text-gray-400"
                  />
                  <Button 
                    onClick={handleAddComment}
                    className="self-start"
                  >
                    تسجيل
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {formData.maintenanceSatisfaction.comments.map((comment, index) => (
                    <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-200">
                        {comment.text}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {comment.username} - {comment.date} {comment.time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function getServiceLabel(key: string): string {
  const labels: Record<string, string> = {
    complaints: 'شكاوى',
    contactRequests: 'طلبات تواصل',
    maintenanceRequests: 'طلبات صيانة',
    inquiries: 'استفسارات',
    officeInterested: 'مهتمين مكاتب',
    projectsInterested: 'مهتمين مشاريع',
    customersInterested: 'عملاء مهتمين',
    general: 'استفسارات عامة',
    documentRequests: 'طلب وثائق',
    deedInquiries: 'استفسارات صكوك',
    apartmentRentals: 'تأجير شقق',
    soldProjects: 'مشاريع مباعة',
    cancelled: 'ملغية',
    resolved: 'منجزة',
    inProgress: 'قيد التنفيذ'
  };
  return labels[key] || key;
}

function getSatisfactionLabel(key: string): string {
  const labels: Record<string, string> = {
    veryHappy: 'راضي جداً',
    happy: 'راضي',
    neutral: 'محايد',
    unhappy: 'غير راضي',
    veryUnhappy: 'غير راضي جداً'
  };
  return labels[key] || key;
}

function getSatisfactionTitle(category: string): string {
  const titles: Record<string, string> = {
    serviceQuality: 'جودة الخدمة',
    closureTime: 'وقت الإغلاق',
    firstTimeResolution: 'الحل من أول مرة'
  };
  return titles[category] || category;
} 