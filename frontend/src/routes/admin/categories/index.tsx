import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from '@tanstack/react-router';
import { Wrench } from 'lucide-react';

export const Route = createFileRoute('/admin/categories/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    // Используем bg-background для основного фона страницы.
    // В темном режиме это будет очень темный серый/черный, в светлом — белый.
    <div className="flex h-screen items-center justify-center bg-background text-foreground p-4">
      
      {/* Компонент Карточки из shadcn/ui */}
      {/* bg-card автоматически адаптируется к текущей теме */}
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          {/* Иконка и бейдж статуса */}
          <div className="flex justify-center mb-4">
            {/* Используем accent цвет из темы */}
            <Wrench className="h-12 w-12 text-blue-500 animate-pulse" />
          </div>
          {/* Фиолетовый бейдж, который должен хорошо смотреться в обеих темах */}
          <Badge variant="outline" className="inline-flex justify-center mx-auto mb-4 bg-purple-500/10 text-purple-400 border-purple-500 hover:bg-purple-500/10">
            Work in Progress
          </Badge>
          
          <CardTitle className="text-4xl font-extrabold">
            Наш сайт в разработке
          </CardTitle>
          {/* Используем muted-foreground для второстепенного текста */}
          <CardDescription className="mt-2 text-muted-foreground">
            Мы готовим нечто особенное! Скоро здесь появится наш новый проект.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground/70 mb-6">
            Ориентировочная дата запуска: 29 января 2026
          </p>
          {/* Используем primary цвет для основной кнопки */}
          <Button>
            Подписаться на обновления
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


